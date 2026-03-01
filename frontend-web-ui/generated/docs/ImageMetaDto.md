
# ImageMetaDto

Transformed metadata of an uploaded image

## Properties

Name | Type
------------ | -------------
`hasImage` | boolean
`contentType` | string
`filename` | string

## Example

```typescript
import type { ImageMetaDto } from ''

// TODO: Update the object below with actual values
const example = {
  "hasImage": null,
  "contentType": null,
  "filename": null,
} satisfies ImageMetaDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ImageMetaDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


