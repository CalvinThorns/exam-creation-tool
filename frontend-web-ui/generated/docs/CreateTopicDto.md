
# CreateTopicDto


## Properties

Name | Type
------------ | -------------
`courseId` | string
`topic` | string
`description` | string
`points` | number
`tasks` | [Array&lt;CreateTaskDto&gt;](CreateTaskDto.md)

## Example

```typescript
import type { CreateTopicDto } from ''

// TODO: Update the object below with actual values
const example = {
  "courseId": null,
  "topic": null,
  "description": null,
  "points": null,
  "tasks": null,
} satisfies CreateTopicDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CreateTopicDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


