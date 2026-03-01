
# ExamDto


## Properties

Name | Type
------------ | -------------
`id` | string
`courseId` | string
`points` | number
`topics` | Array&lt;string&gt;
`createdAt` | Date
`updatedAt` | Date

## Example

```typescript
import type { ExamDto } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "courseId": null,
  "points": null,
  "topics": null,
  "createdAt": null,
  "updatedAt": null,
} satisfies ExamDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ExamDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


