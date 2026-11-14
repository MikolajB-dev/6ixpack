#ifndef NFC_READER_H_
#define NFC_READER_H_

#include <stddef.h>
#include <stdint.h>

/* The PN532 driver is used when i2c21 is enabled (pn532.overlay), otherwise RC522. */
#define USE_PN532 DT_NODE_HAS_STATUS(DT_NODELABEL(i2c21), okay)

/* Returns 0 on success, negative errno if the reader does not answer. */
int nfc_reader_init(void);

/*
 * Looks for one ISO14443-A tag (NTAG, MIFARE Ultralight/Classic, ...).
 * Returns the UID length (4, 7 or 10) and fills uid, or 0 if no tag is there.
 */
int nfc_reader_poll(uint8_t *uid, size_t max_len);

const char *nfc_reader_name(void);

#endif
