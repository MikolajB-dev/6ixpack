/* Minimal PN532 driver over I2C: reads the UID of one ISO14443-A tag. */
#include <zephyr/devicetree.h>
#include "nfc_reader.h"

#if USE_PN532

#include <errno.h>
#include <string.h>
#include <zephyr/kernel.h>
#include <zephyr/drivers/i2c.h>
#include <zephyr/sys/printk.h>

#define PN532_ADDR 0x24

static const struct device *i2c = DEVICE_DT_GET(DT_NODELABEL(i2c21));

static int write_frame(const uint8_t *data, size_t len)
{
	uint8_t f[40];
	size_t i = 0;
	uint8_t l = (uint8_t)(len + 1);
	uint8_t sum = 0xD4;

	if (len > sizeof(f) - 9) {
		return -EINVAL;
	}
	f[i++] = 0x00;
	f[i++] = 0x00;
	f[i++] = 0xFF;
	f[i++] = l;
	f[i++] = (uint8_t)(~l + 1);
	f[i++] = 0xD4; /* host -> PN532 */
	for (size_t j = 0; j < len; j++) {
		f[i++] = data[j];
		sum += data[j];
	}
	f[i++] = (uint8_t)(~sum + 1);
	f[i++] = 0x00;
	return i2c_write(i2c, f, i, PN532_ADDR);
}

static int wait_ready(int timeout_ms)
{
	int64_t end = k_uptime_get() + timeout_ms;
	uint8_t status;

	while (k_uptime_get() < end) {
		if (i2c_read(i2c, &status, 1, PN532_ADDR) == 0 && (status & 0x01)) {
			return 0;
		}
		k_msleep(2);
	}
	return -ETIMEDOUT;
}

/* Sends a command, returns number of response data bytes copied to resp (after D5 cmd+1). */
static int command(const uint8_t *cmd, size_t len, uint8_t *resp, size_t rmax, int timeout_ms)
{
	static const uint8_t ack_ok[6] = { 0x00, 0x00, 0xFF, 0x00, 0xFF, 0x00 };
	uint8_t ack[7];
	uint8_t buf[48];

	if (write_frame(cmd, len)) {
		return -EIO;
	}
	if (wait_ready(30)) {
		return -ETIMEDOUT;
	}
	if (i2c_read(i2c, ack, sizeof(ack), PN532_ADDR) || memcmp(&ack[1], ack_ok, 6)) {
		return -EIO;
	}
	if (wait_ready(timeout_ms)) {
		return -ETIMEDOUT;
	}
	if (i2c_read(i2c, buf, sizeof(buf), PN532_ADDR)) {
		return -EIO;
	}
	/* buf: status, 00 00 FF, LEN, LCS, D5, cmd+1, data... */
	if (buf[1] != 0x00 || buf[2] != 0x00 || buf[3] != 0xFF) {
		return -EIO;
	}
	if (buf[6] != 0xD5 || buf[7] != (uint8_t)(cmd[0] + 1) || buf[4] < 2) {
		return -EIO;
	}

	size_t dlen = buf[4] - 2;

	if (dlen > sizeof(buf) - 8) {
		dlen = sizeof(buf) - 8;
	}
	if (dlen > rmax) {
		dlen = rmax;
	}
	memcpy(resp, &buf[8], dlen);
	return (int)dlen;
}

int nfc_reader_init(void)
{
	uint8_t resp[8];
	int n = -1;

	if (!device_is_ready(i2c)) {
		return -ENODEV;
	}

	/* The first transfer may only wake the chip up, so retry. */
	for (int i = 0; i < 5 && n < 0; i++) {
		static const uint8_t get_fw[] = { 0x02 };

		n = command(get_fw, sizeof(get_fw), resp, sizeof(resp), 100);
		if (n < 0) {
			k_msleep(50);
		}
	}
	if (n < 4) {
		return -EIO;
	}
	printk("PN5%02X firmware %d.%d\n", resp[0], resp[1], resp[2]);

	static const uint8_t sam[] = { 0x14, 0x01, 0x14, 0x01 };       /* SAMConfiguration: normal */
	static const uint8_t retries[] = { 0x32, 0x05, 0xFF, 0x01, 0x02 }; /* don't wait forever for a tag */

	if (command(sam, sizeof(sam), resp, sizeof(resp), 100) < 0 ||
	    command(retries, sizeof(retries), resp, sizeof(resp), 100) < 0) {
		return -EIO;
	}
	return 0;
}

int nfc_reader_poll(uint8_t *uid, size_t max_len)
{
	static const uint8_t field_off[] = { 0x32, 0x01, 0x00 };
	static const uint8_t field_on[] = { 0x32, 0x01, 0x03 };
	static const uint8_t list[] = { 0x4A, 0x01, 0x00 }; /* 1 target, 106 kbps type A */
	uint8_t resp[24];

	/* Switch the field off and on so a tag that stays on the reader is seen again. */
	command(field_off, sizeof(field_off), resp, sizeof(resp), 50);
	k_msleep(5);
	command(field_on, sizeof(field_on), resp, sizeof(resp), 50);

	int n = command(list, sizeof(list), resp, sizeof(resp), 200);

	/* resp: NbTg, Tg, ATQA(2), SAK, UIDlen, UID... */
	if (n < 6 || resp[0] == 0) {
		return 0;
	}

	size_t len = resp[5];

	if (len > max_len || 6 + len > (size_t)n) {
		return 0;
	}
	memcpy(uid, &resp[6], len);
	return (int)len;
}

const char *nfc_reader_name(void)
{
	return "PN532 (I2C)";
}

#endif /* USE_PN532 */
