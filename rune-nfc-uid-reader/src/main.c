/*
 * Rune board, step 1: read the ID (UID) of an NFC tag and print it.
 *
 * Output on the DK's USB serial port (115200 baud):
 *   TAG 04A1B2C3D4E5F6     when a tag is placed on the reader
 *   REMOVED                when it is taken away
 * LED0 is on while a tag is on the reader.
 */
#include <zephyr/kernel.h>
#include <zephyr/devicetree.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/sys/printk.h>
#include <string.h>
#include "nfc_reader.h"

#define POLL_MS     100
#define MISSES_GONE 3   /* polls without the tag before we call it removed */

static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);

static void print_uid(const uint8_t *uid, int len)
{
	printk("TAG ");
	for (int i = 0; i < len; i++) {
		printk("%02X", uid[i]);
	}
	printk("\n");
}

int main(void)
{
	uint8_t uid[10], last_uid[10];
	int last_len = 0;
	int misses = 0;

	gpio_pin_configure_dt(&led, GPIO_OUTPUT_INACTIVE);
	printk("\nRune NFC UID reader, using %s\n", nfc_reader_name());

	while (nfc_reader_init() != 0) {
		printk("Reader not found. Check wiring and that VDD is 3.3 V. Retrying...\n");
		k_msleep(2000);
	}
	printk("Reader ready. Put a tag on it.\n");

	while (true) {
		int len = nfc_reader_poll(uid, sizeof(uid));

		if (len > 0) {
			misses = 0;
			if (len != last_len || memcmp(uid, last_uid, len) != 0) {
				print_uid(uid, len);
				memcpy(last_uid, uid, len);
				last_len = len;
				gpio_pin_set_dt(&led, 1);
			}
		} else if (last_len > 0 && ++misses >= MISSES_GONE) {
			printk("REMOVED\n");
			last_len = 0;
			gpio_pin_set_dt(&led, 0);
		}
		k_msleep(POLL_MS);
	}
	return 0;
}
