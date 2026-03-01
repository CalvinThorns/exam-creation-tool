# CoursesApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createCourse**](CoursesApi.md#createcourse) | **POST** /api/courses | Create a new course |
| [**deleteCourse**](CoursesApi.md#deletecourse) | **DELETE** /api/courses/{id} | Delete a course by ID |
| [**getCourseById**](CoursesApi.md#getcoursebyid) | **GET** /api/courses/{id} | Get a course by ID |
| [**getCourses**](CoursesApi.md#getcourses) | **GET** /api/courses | Get all courses |
| [**updateCourse**](CoursesApi.md#updatecourse) | **PUT** /api/courses/{id} | Update a course by ID |



## createCourse

> CourseDto createCourse(createCourseDto)

Create a new course

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { CreateCourseRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // CreateCourseDto
    createCourseDto: ...,
  } satisfies CreateCourseRequest;

  try {
    const data = await api.createCourse(body);
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
| **createCourseDto** | [CreateCourseDto](CreateCourseDto.md) |  | |

### Return type

[**CourseDto**](CourseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Course successfully created |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteCourse

> deleteCourse(id)

Delete a course by ID

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { DeleteCourseRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // string
    id: id_example,
  } satisfies DeleteCourseRequest;

  try {
    const data = await api.deleteCourse(body);
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
| **204** | Course successfully deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getCourseById

> CourseDto getCourseById(id)

Get a course by ID

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { GetCourseByIdRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // string | The unique course ID
    id: id_example,
  } satisfies GetCourseByIdRequest;

  try {
    const data = await api.getCourseById(body);
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
| **id** | `string` | The unique course ID | [Defaults to `undefined`] |

### Return type

[**CourseDto**](CourseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Course details |  -  |
| **404** | Course not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getCourses

> PaginatedCoursesDto getCourses()

Get all courses

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { GetCoursesRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  try {
    const data = await api.getCourses();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**PaginatedCoursesDto**](PaginatedCoursesDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A paginated list of all courses |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateCourse

> CourseDto updateCourse(id, updateCourseDto)

Update a course by ID

### Example

```ts
import {
  Configuration,
  CoursesApi,
} from '';
import type { UpdateCourseRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CoursesApi();

  const body = {
    // string
    id: id_example,
    // UpdateCourseDto
    updateCourseDto: ...,
  } satisfies UpdateCourseRequest;

  try {
    const data = await api.updateCourse(body);
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
| **updateCourseDto** | [UpdateCourseDto](UpdateCourseDto.md) |  | |

### Return type

[**CourseDto**](CourseDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Course successfully updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

