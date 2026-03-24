# System Architecture

Nginx (Gateway): Handles all incoming traffic on Port 80.

Frontend-Web-UI: React/Vite application.

Task-Service: Manages Courses and Topics (/api/courses, /api/topics).

Exam-Service: Manages Exam logic and PDF orchestration (/api/exams).

CLSI: Local LaTeX compilation service.MongoDB: Database for all services.

Docker image and container naming standard:

- Images: autogenex/<service>:local
- Containers: autogenex-<service>


# Getting Started

Follow these steps in order to get the system running on your local machine. 

**Ensure you have the following installed on your system:**

Docker & Docker Desktop: To run the containerized services.

Node.js (v18 or higher): Required for local DTO/API client generation.

npm: Installed automatically with Node.js.

**Generate API Clients (DTOs)**

Before the Frontend can talk to the Backends, you must generate the TypeScript/JavaScript clients from the OpenAPI specifications.

Navigate to the frontend folder:Install local dependencies:Generate the API hooks and DTOs:

```bash
cd frontend-web-ui
npm install
npm run generate-api
cd ..
```

**Start the Infrastructure**

Navigate back to the project root directory (where the docker-compose.yml is located) and use the following commands:

A. Build and Start (First-time or after code changes):

```bash
docker compose up --build
```

B. Run in the background (Detached mode):

```bash
docker compose up -d
```

C. Stop the system (keeps data):

```bash
docker compose stop
```

D. Remove containers and network:

```bash
docker compose down
```

E. Reset everything (Warning: Deletes all Database data!):

```bash
docker compose down -v
```

F. Validate Docker Compose before startup:

```bash
docker compose config
```

**Access Links**

Frontend: http://localhost

API Gateway: http://localhost/api/

CLSI Service: http://localhost:3013

Exam Service: http://localhost:3000

Task Service: http://localhost:3001


## Docker Best Practices Implemented

- Explicit project name, image names, and container names
- Healthchecks on gateway, frontend, exam-service, task-service, and mongodb
- Dependency ordering using health conditions
- Non-root runtime user for Node.js API services
- Log rotation policy for all services (10 MB x 3 files)
- Optimized build contexts via .dockerignore files
- Pinned base image versions for gateway and mongodb
- Pinned frontend runtime nginx image version
- `init: true` enabled for all services for better signal handling
- `no-new-privileges` enabled for all services
- Read-only root filesystem plus `tmpfs` for nginx-based services


# Common Fixes
**Container Name Conflict:**

If you get an error that autogenex-clsi is already in use, run: docker rm -f autogenex-clsi

If nginx config changes are not reflected, restart the gateway:

```bash
docker compose restart gateway
```

**Port 80 busy:**

If Port 80 is used by another program (like Skype, Apache, or IIS), you must stop that program or change the Nginx port mapping in docker-compose.yml.
