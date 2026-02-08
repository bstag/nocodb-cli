# NocoDB CLI E2E Report

Base: https://noco.stagware.org (id: p6lg5hpy02yngmk)
Started: 2026-02-08T21:07:21.499Z
Finished: 2026-02-08T21:09:09.360Z

## Summary
- Columns: 23 passed, 0 failed, 0 skipped
- Links: 1 passed, 0 failed
- Features: 23 passed, 1 failed, 0 skipped

## Tables
- CliE2E_Primary_2026-02-08T21-07-21-498Z (mbpho1y5q6f6gen)
- CliE2E_Secondary_2026-02-08T21-07-21-498Z (mkgquof0yjtlogq)
- CliE2E_Formula_2026-02-08T21-07-21-498Z (me58jwk1g6tqv17)
- CliE2E_Types_2026-02-08T21-07-21-498Z (movworwyl2jzgs8)

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
- PASSED: /api/v2/tables/mcrfdeo6x5qqt6n/links/{linkFieldId}/records/{recordId} (linkFieldId=cpb2h7wyafw8fhd)

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
- PASSED: hooks
- PASSED: tokens
- PASSED: sources
- FAILED: users - Assertion failed: users list should have at least one user
- PASSED: comments
- PASSED: sharedViews
- PASSED: sharedBase
- PASSED: viewConfig
