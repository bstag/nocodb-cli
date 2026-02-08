# NocoDB CLI E2E Report

Base: https://noco.stagware.org (id: p6lg5hpy02yngmk)
Started: 2026-02-07T22:15:17.428Z
Finished: 2026-02-07T22:16:25.523Z

## Summary
- Columns: 23 passed, 0 failed, 0 skipped
- Links: 1 passed, 0 failed
- Features: 16 passed, 2 failed, 0 skipped

## Tables
- CliE2E_Primary_2026-02-07T22-15-17-428Z (mkov9ryvr7wal9x)
- CliE2E_Secondary_2026-02-07T22-15-17-428Z (m04vhzyo1gr92v1)
- CliE2E_Formula_2026-02-07T22-15-17-428Z (mr4ye3hkcmv2h3g)
- CliE2E_Types_2026-02-07T22-15-17-428Z (m5ombv7nj8lgdss)

## Column Tests
- PASSED: LinkToSecondary [LinkToAnotherRecord]
- PASSED: LookupTitle [Lookup]
- PASSED: RollupCount [Rollup]
- PASSED: Computed [Formula]
- PASSED: Text [SingleLineText]
- PASSED: LongText [LongText]
- PASSED: NumberCol [Number]
- PASSED: DecimalCol [Decimal]
- PASSED: CheckboxCol [Checkbox]
- PASSED: DateCol [Date]
- PASSED: DateTimeCol [DateTime]
- PASSED: EmailCol [Email]
- PASSED: UrlCol [URL]
- PASSED: PhoneCol [PhoneNumber]
- PASSED: PercentCol [Percent]
- PASSED: RatingCol [Rating]
- PASSED: JsonCol [JSON]
- PASSED: CurrencyCol [Currency]
- PASSED: DurationCol [Duration]
- PASSED: GeoCol [GeoData]
- PASSED: AttachmentCol [Attachment]
- PASSED: SingleSelectCol [SingleSelect]
- PASSED: MultiSelectCol [MultiSelect]

## Link Tests
- PASSED: /api/v2/tables/mt401pxryf9zjmc/links/{linkFieldId}/records/{recordId} (linkFieldId=chd2lb3pf0mep4r)

## Feature Tests
- PASSED: workspace
- PASSED: bases
- PASSED: tablesExtra
- PASSED: views
- PASSED: filters
- PASSED: sorts
- PASSED: upsert
- PASSED: bulkOps
- PASSED: bulkUpsert
- PASSED: request
- PASSED: metaEndpoints
- PASSED: dynamicApi
- PASSED: storageUpload
- PASSED: schemaIntrospect
- PASSED: me
- PASSED: selectFilter
- FAILED: hooks - ❌ Validation Error: hook version is deprecated / not supported anymore
   Status Code: 400

- SKIPPED: tokens - Requires session auth, not API token
- FAILED: users - Assertion failed: users list should have at least one user (the current user)
