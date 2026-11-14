/* Minimal MFRC522 (RC522) driver: reads the UID of one ISO14443-A tag. */
#include <zephyr/devicetree.h>
#include "nfc_reader.h"

#if !USE_PN532

#include <errno.h>
#include <zephyr/kernel.h>
#include <zephyr/drivers/spi.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/sys/printk.h>

/* Registers */
#define CommandReg    0x01
#define ComIrqReg     0x04
#define DivIrqReg     0x05
#define ErrorReg      0x06
#define FIFODataReg   0x09
#define FIFOLevelReg  0x0A
#define ControlReg    0x0C
#define BitFramingReg 0x0D
#define CollReg       0x0E
#define ModeReg       0x11
#define TxModeReg     0x12
#define RxModeReg     0x13
#define TxControlReg  0x14
#define TxASKReg      0x15
#define ModWidthReg   0x24
#define TModeReg      0x2A
#define TPrescalerReg 0x2B
#define TReloadRegH   0x2C
#define TReloadRegL   0x2D
#define VersionReg    0x37

/* Commands */
#define CMD_IDLE       0x00
#define CMD_TRANSCEIVE 0x0C
#define CMD_SOFTRESET  0x0F

static const struct device *spi = DEVICE_DT_GET(DT_NODELABEL(spi21));
static const struct gpio_dt_spec cs = GPIO_DT_SPEC_GET(DT_PATH(zephyr_user), rc522_cs_gpios);
static const struct spi_config spi_cfg = {
	.frequency = 4000000,
	.operation = SPI_WORD_SET(8) | SPI_TRANSFER_MSB, /* controller, mode 0 */
	.slave = 0,
};

static int xfer(uint8_t *tx, uint8_t *rx, size_t len)
{
	struct spi_buf tb = { .buf = tx, .len = len };
	struct spi_buf rb = { .buf = rx, .len = len };
	struct spi_buf_set ts = { .buffers = &tb, .count = 1 };
	struct spi_buf_set rs = { .buffers = &rb, .count = 1 };

	gpio_pin_set_dt(&cs, 1);
	int err = spi_transceive(spi, &spi_cfg, &ts, &rs);
	gpio_pin_set_dt(&cs, 0);
	return err;
}

static void wr(uint8_t reg, uint8_t val)
{
	uint8_t tx[2] = { (reg << 1) & 0x7E, val };
	uint8_t rx[2];

	xfer(tx, rx, 2);
}

static uint8_t rd(uint8_t reg)
{
	uint8_t tx[2] = { ((reg << 1) & 0x7E) | 0x80, 0 };
	uint8_t rx[2] = { 0 };

	xfer(tx, rx, 2);
	return rx[1];
}

static void set_bits(uint8_t reg, uint8_t mask) { wr(reg, rd(reg) | mask); }
static void clr_bits(uint8_t reg, uint8_t mask) { wr(reg, rd(reg) & ~mask); }

/* ISO14443-A CRC */
static void crc_a(const uint8_t *d, size_t n, uint8_t out[2])
{
	uint16_t crc = 0x6363;

	while (n--) {
		uint8_t ch = *d++ ^ (uint8_t)(crc & 0xFF);
		ch ^= (uint8_t)(ch << 4);
		crc = (crc >> 8) ^ ((uint16_t)ch << 8) ^ ((uint16_t)ch << 3) ^ ((uint16_t)ch >> 4);
	}
	out[0] = crc & 0xFF;
	out[1] = crc >> 8;
}

static int transceive(const uint8_t *send, size_t slen, uint8_t *back, size_t *blen,
		      uint8_t last_bits)
{
	wr(CommandReg, CMD_IDLE);
	wr(ComIrqReg, 0x7F);      /* clear irqs */
	wr(FIFOLevelReg, 0x80);   /* flush FIFO */
	for (size_t i = 0; i < slen; i++) {
		wr(FIFODataReg, send[i]);
	}
	wr(BitFramingReg, last_bits & 0x07);
	wr(CommandReg, CMD_TRANSCEIVE);
	set_bits(BitFramingReg, 0x80); /* StartSend */

	int64_t deadline = k_uptime_get() + 40;

	while (true) {
		uint8_t irq = rd(ComIrqReg);

		if (irq & 0x30) {        /* RxIRq | IdleIRq */
			break;
		}
		if (irq & 0x01) {        /* TimerIRq: nobody answered */
			return -ETIMEDOUT;
		}
		if (k_uptime_get() > deadline) {
			return -ETIMEDOUT;
		}
	}
	clr_bits(BitFramingReg, 0x80);

	uint8_t err = rd(ErrorReg);

	if (err & 0x13) {                /* BufferOvfl | ParityErr | ProtocolErr */
		return -EIO;
	}
	if (err & 0x08) {                /* collision: more than one tag */
		return -EBUSY;
	}

	uint8_t n = rd(FIFOLevelReg);

	if (n > *blen) {
		n = *blen;
	}
	for (uint8_t i = 0; i < n; i++) {
		back[i] = rd(FIFODataReg);
	}
	*blen = n;
	return 0;
}

int nfc_reader_init(void)
{
	if (!device_is_ready(spi) || !gpio_is_ready_dt(&cs)) {
		return -ENODEV;
	}
	gpio_pin_configure_dt(&cs, GPIO_OUTPUT_INACTIVE);

	wr(CommandReg, CMD_SOFTRESET);
	k_msleep(50);

	uint8_t ver = rd(VersionReg);

	printk("RC522 version register: 0x%02X (expected 0x91, 0x92 or 0x88/0x12 for clones)\n", ver);
	if (ver == 0x00 || ver == 0xFF) {
		return -EIO;
	}

	wr(TxModeReg, 0x00);
	wr(RxModeReg, 0x00);
	wr(ModWidthReg, 0x26);
	wr(TModeReg, 0x80);      /* timer starts automatically after sending */
	wr(TPrescalerReg, 0xA9); /* ~40 kHz timer */
	wr(TReloadRegH, 0x03);   /* 1000 ticks = 25 ms timeout */
	wr(TReloadRegL, 0xE8);
	wr(TxASKReg, 0x40);      /* 100% ASK */
	wr(ModeReg, 0x3D);       /* CRC preset 0x6363 */
	set_bits(TxControlReg, 0x03); /* antenna on */
	return 0;
}

int nfc_reader_poll(uint8_t *uid, size_t max_len)
{
	static const uint8_t sel_cmd[3] = { 0x93, 0x95, 0x97 };
	uint8_t atqa[2];
	size_t n = sizeof(atqa);
	uint8_t wupa = 0x52; /* WUPA also wakes tags we halted last time */
	size_t len = 0;

	clr_bits(CollReg, 0x80);
	if (transceive(&wupa, 1, atqa, &n, 7) || n != 2) {
		return 0;
	}

	for (int lvl = 0; lvl < 3; lvl++) {
		uint8_t ac[2] = { sel_cmd[lvl], 0x20 };
		uint8_t b[5];

		n = sizeof(b);
		clr_bits(CollReg, 0x80);
		if (transceive(ac, 2, b, &n, 0) || n != 5) {
			return 0;
		}
		if ((b[0] ^ b[1] ^ b[2] ^ b[3]) != b[4]) {
			return 0; /* bad BCC */
		}

		uint8_t sel[9] = { sel_cmd[lvl], 0x70, b[0], b[1], b[2], b[3], b[4] };
		uint8_t sak[3];

		crc_a(sel, 7, &sel[7]);
		n = sizeof(sak);
		if (transceive(sel, 9, sak, &n, 0) || n != 3) {
			return 0;
		}

		if (b[0] == 0x88) {             /* cascade tag: UID continues */
			for (int i = 1; i < 4 && len < max_len; i++) {
				uid[len++] = b[i];
			}
		} else {
			for (int i = 0; i < 4 && len < max_len; i++) {
				uid[len++] = b[i];
			}
			break;
		}
	}

	/* HLTA: put the tag to sleep so the next WUPA starts fresh. No reply expected. */
	uint8_t hlt[4] = { 0x50, 0x00 };
	uint8_t dummy[4];

	crc_a(hlt, 2, &hlt[2]);
	n = sizeof(dummy);
	transceive(hlt, 4, dummy, &n, 0);

	return (int)len;
}

const char *nfc_reader_name(void)
{
	return "RC522 (SPI)";
}

#endif /* !USE_PN532 */
