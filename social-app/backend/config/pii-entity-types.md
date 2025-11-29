# PII Entity Types Reference

## Custom Entities (Added in main.py)
- `DATE_TIME_DOB` - Date of Birth (custom recognizer)
- `ADDRESS` - Physical addresses (custom recognizer)

## Presidio Standard Entities (Global)
- `CREDIT_CARD` - Credit card numbers
- `CRYPTO` - Cryptocurrency wallet addresses
- `DATE_TIME` - Dates and times (filtered out unless in DOB context)
- `EMAIL_ADDRESS` - Email addresses
- `IBAN_CODE` - International Bank Account Numbers
- `IP_ADDRESS` - IP addresses (IPv4/IPv6)
- `NRP` - Nationality, religious or political group
- `PHONE_NUMBER` - Telephone numbers
- `MEDICAL_LICENSE` - Medical license numbers
- `URL` - URLs (filtered out in your setup)
- `PERSON` - Person names (filtered out in your setup)
- `LOCATION` - Geographic locations (filtered out in your setup)

## Presidio USA Entities
- `US_SSN` - US Social Security Number
- `US_BANK_NUMBER` - US bank account numbers
- `US_DRIVER_LICENSE` - US driver license numbers
- `US_ITIN` - US Individual Taxpayer Identification Number
- `US_PASSPORT` - US passport numbers

## Note on Entity Type Format
The Python API returns entity types with **spaces** instead of underscores:
- API returns: `"DATE TIME DOB"`, `"CREDIT CARD"`, `"US SSN"`
- Config uses: `"DATE_TIME_DOB"`, `"CREDIT_CARD"`, `"US_SSN"`

The middleware normalization function handles this conversion automatically.

## Filtered Entities
The following entities are filtered out in your Python setup:
- `URL` - Not returned
- `PERSON` - Not returned
- `LOCATION` - Not returned
- `DATE_TIME` - Only returned if in DOB context (converted to `DATE_TIME_DOB`)

## Low Confidence Entities
Entities with confidence < 0.4 are categorized as `"others"` in the API response.

