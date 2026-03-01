# TopicsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createTopic**](TopicsApi.md#createtopic) | **POST** /api/topics | Create a new topic |
| [**deleteTopic**](TopicsApi.md#deletetopic) | **DELETE** /api/topics/{id} | Delete a topic by ID |
| [**getTopicById**](TopicsApi.md#gettopicbyid) | **GET** /api/topics/{id} | Get a topic by ID |
| [**getTopics**](TopicsApi.md#gettopics) | **GET** /api/topics | Get all topics |
| [**updateTopic**](TopicsApi.md#updatetopic) | **PUT** /api/topics/{id} | Update a topic by ID |
| [**uploadTopicImage**](TopicsApi.md#uploadtopicimage) | **POST** /api/topics/{id}/images | Upload an image for a topic |



## createTopic

> TopicDto createTopic(createTopicDto)

Create a new topic

### Example

```ts
import {
  Configuration,
  TopicsApi,
} from '';
import type { CreateTopicRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TopicsApi();

  const body = {
    // CreateTopicDto
    createTopicDto: ...,
  } satisfies CreateTopicRequest;

  try {
    const data = await api.createTopic(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **createTopicDto** | [CreateTopicDto](CreateTopicDto.md) |  | |

### Return type

[**TopicDto**](TopicDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Topic successfully created |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteTopic

> deleteTopic(id)

Delete a topic by ID

### Example

```ts
import {
  Configuration,
  TopicsApi,
} from '';
import type { DeleteTopicRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TopicsApi();

  const body = {
    // string
    id: id_example,
  } satisfies DeleteTopicRequest;

  try {
    const data = await api.deleteTopic(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **204** | Topic successfully deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getTopicById

> TopicDto getTopicById(id)

Get a topic by ID

### Example

```ts
import {
  Configuration,
  TopicsApi,
} from '';
import type { GetTopicByIdRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TopicsApi();

  const body = {
    // string
    id: id_example,
  } satisfies GetTopicByIdRequest;

  try {
    const data = await api.getTopicById(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |

### Return type

[**TopicDto**](TopicDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Topic details |  -  |
| **404** | Topic not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getTopics

> PaginatedTopicsDto getTopics(courseId)

Get all topics

### Example

```ts
import {
  Configuration,
  TopicsApi,
} from '';
import type { GetTopicsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TopicsApi();

  const body = {
    // string | Filter topics by a specific course ID (optional)
    courseId: courseId_example,
  } satisfies GetTopicsRequest;

  try {
    const data = await api.getTopics(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **courseId** | `string` | Filter topics by a specific course ID | [Optional] [Defaults to `undefined`] |

### Return type

[**PaginatedTopicsDto**](PaginatedTopicsDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A paginated list of all topics |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateTopic

> TopicDto updateTopic(id, updateTopicDto)

Update a topic by ID

### Example

```ts
import {
  Configuration,
  TopicsApi,
} from '';
import type { UpdateTopicRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TopicsApi();

  const body = {
    // string
    id: id_example,
    // UpdateTopicDto
    updateTopicDto: ...,
  } satisfies UpdateTopicRequest;

  try {
    const data = await api.updateTopic(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |
| **updateTopicDto** | [UpdateTopicDto](UpdateTopicDto.md) |  | |

### Return type

[**TopicDto**](TopicDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Topic successfully updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## uploadTopicImage

> uploadTopicImage(id, image)

Upload an image for a topic

### Example

```ts
import {
  Configuration,
  TopicsApi,
} from '';
import type { UploadTopicImageRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TopicsApi();

  const body = {
    // string
    id: id_example,
    // Blob (optional)
    image: BINARY_DATA_HERE,
  } satisfies UploadTopicImageRequest;

  try {
    const data = await api.uploadTopicImage(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **id** | `string` |  | [Defaults to `undefined`] |
| **image** | `Blob` |  | [Optional] [Defaults to `undefined`] |

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `multipart/form-data`
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Image uploaded successfully |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

