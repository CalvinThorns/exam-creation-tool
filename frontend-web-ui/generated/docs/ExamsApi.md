# ExamsApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createExam**](ExamsApi.md#createexam) | **POST** /api/exams | Create a new exam |
| [**deleteExam**](ExamsApi.md#deleteexam) | **DELETE** /api/exams/{id} | Delete an exam by ID |
| [**generateExamPdf**](ExamsApi.md#generateexampdf) | **POST** /api/exams/generate | Generate PDF for an exam |
| [**getExamById**](ExamsApi.md#getexambyid) | **GET** /api/exams/{id} | Get an exam by ID |
| [**getExams**](ExamsApi.md#getexams) | **GET** /api/exams | Get all exams |
| [**updateExam**](ExamsApi.md#updateexam) | **PUT** /api/exams/{id} | Update an exam by ID |



## createExam

> ExamDto createExam(createExamDto)

Create a new exam

### Example

```ts
import {
  Configuration,
  ExamsApi,
} from '';
import type { CreateExamRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ExamsApi();

  const body = {
    // CreateExamDto
    createExamDto: ...,
  } satisfies CreateExamRequest;

  try {
    const data = await api.createExam(body);
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
| **createExamDto** | [CreateExamDto](CreateExamDto.md) |  | |

### Return type

[**ExamDto**](ExamDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **201** | Exam successfully created |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteExam

> deleteExam(id)

Delete an exam by ID

### Example

```ts
import {
  Configuration,
  ExamsApi,
} from '';
import type { DeleteExamRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ExamsApi();

  const body = {
    // string
    id: id_example,
  } satisfies DeleteExamRequest;

  try {
    const data = await api.deleteExam(body);
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
| **204** | Exam successfully deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## generateExamPdf

> generateExamPdf(generateExamRequestDto)

Generate PDF for an exam

Triggers the LaTeX builder and compiles the exam via the CLSI service.

### Example

```ts
import {
  Configuration,
  ExamsApi,
} from '';
import type { GenerateExamPdfRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ExamsApi();

  const body = {
    // GenerateExamRequestDto
    generateExamRequestDto: ...,
  } satisfies GenerateExamPdfRequest;

  try {
    const data = await api.generateExamPdf(body);
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
| **generateExamRequestDto** | [GenerateExamRequestDto](GenerateExamRequestDto.md) |  | |

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Exam generated successfully |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getExamById

> ExamDto getExamById(id)

Get an exam by ID

### Example

```ts
import {
  Configuration,
  ExamsApi,
} from '';
import type { GetExamByIdRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ExamsApi();

  const body = {
    // string
    id: id_example,
  } satisfies GetExamByIdRequest;

  try {
    const data = await api.getExamById(body);
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

[**ExamDto**](ExamDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Exam details |  -  |
| **404** | Exam not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getExams

> PaginatedExamsDto getExams()

Get all exams

### Example

```ts
import {
  Configuration,
  ExamsApi,
} from '';
import type { GetExamsRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ExamsApi();

  try {
    const data = await api.getExams();
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

[**PaginatedExamsDto**](PaginatedExamsDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A paginated list of all exams |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateExam

> ExamDto updateExam(id, updateExamDto)

Update an exam by ID

### Example

```ts
import {
  Configuration,
  ExamsApi,
} from '';
import type { UpdateExamRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ExamsApi();

  const body = {
    // string
    id: id_example,
    // UpdateExamDto
    updateExamDto: ...,
  } satisfies UpdateExamRequest;

  try {
    const data = await api.updateExam(body);
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
| **updateExamDto** | [UpdateExamDto](UpdateExamDto.md) |  | |

### Return type

[**ExamDto**](ExamDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Exam successfully updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

