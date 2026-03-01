
# TaskDto


## Properties

Name | Type
------------ | -------------
`id` | string
`question` | string
`points` | number
`questionImg` | [ImageMetaDto](ImageMetaDto.md)
`solution` | string
`isRelatedToTopic` | boolean

## Example

```typescript
import type { TaskDto } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "question": null,
  "points": null,
  "questionImg": null,
  "solution": null,
  "isRelatedToTopic": null,
} satisfies TaskDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TaskDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


