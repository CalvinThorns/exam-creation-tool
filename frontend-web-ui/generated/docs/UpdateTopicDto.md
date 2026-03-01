
# UpdateTopicDto


## Properties

Name | Type
------------ | -------------
`topic` | string
`description` | string
`points` | number
`tasks` | [Array&lt;UpdateTaskDto&gt;](UpdateTaskDto.md)

## Example

```typescript
import type { UpdateTopicDto } from ''

// TODO: Update the object below with actual values
const example = {
  "topic": null,
  "description": null,
  "points": null,
  "tasks": null,
} satisfies UpdateTopicDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateTopicDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


