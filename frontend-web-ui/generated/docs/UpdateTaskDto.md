
# UpdateTaskDto


## Properties

Name | Type
------------ | -------------
`question` | string
`points` | number
`solution` | string
`isRelatedToTopic` | boolean

## Example

```typescript
import type { UpdateTaskDto } from ''

// TODO: Update the object below with actual values
const example = {
  "question": null,
  "points": null,
  "solution": null,
  "isRelatedToTopic": null,
} satisfies UpdateTaskDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateTaskDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


