
# TopicDto


## Properties

Name | Type
------------ | -------------
`id` | string
`courseId` | string
`topic` | string
`description` | string
`points` | number
`descriptionImg` | [ImageMetaDto](ImageMetaDto.md)
`tasks` | [Array&lt;TaskDto&gt;](TaskDto.md)
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { TopicDto } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "courseId": null,
  "topic": null,
  "description": null,
  "points": null,
  "descriptionImg": null,
  "tasks": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies TopicDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TopicDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


