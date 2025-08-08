# Collateral Appraisal System

A modern React-based application for managing property appraisals and collateral valuations.

## 🧠 Technology Stack

- ⚛️ **React** (via Vite) – component-driven UI
- 🧵 **Zustand** – global and local state management
- 🔁 **@tanstack/react-query** – API data fetching & caching
- 🎨 **Tailwind CSS** – utility-first styling
- 📁 **Feature-based structure** – scalable & organized
- 🧰 TypeScript, ESLint, Prettier, and path aliasing for DX
- 📝 **React Hook Form**
- 📐 **Zod** – for schema validation
- 🖼️ **Headless UI, DaisyUI** – for components

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory based on the `.env.example` template

### Development

Run the development server:

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

## 📂 Project Structure

```
src/
├── app/                    # App-wide setup (routing, layout, providers)
│   ├── App.tsx
│   ├── main.tsx
│   └── router.tsx
│
├── features/               # All business logic grouped by feature
│   ├── auth/
│   │   ├── components/     # Auth-specific UI components
│   │   ├── pages/          # Pages (e.g., LoginPage.tsx)
│   │   ├── hooks/          # Custom hooks for auth
│   │   ├── store.ts        # Zustand store
│   │   ├── api.ts          # React Query functions
│   │   └── types.ts
│   └── dashboard/
│       └── ...
│
├── shared/                 # Reusable code across features
│   ├── components/         # Shared UI components
│   ├── hooks/              # Utility hooks
│   ├── api/                # Axios instance and helpers
│   ├── utils/              # Pure functions/helpers
│   └── types/              # Global types/interfaces
│
├── styles/                 # Tailwind config and global styles
│   └── tailwind.css
│
├── config/                 # App config, env helpers
└── assets/                 # Images, fonts, etc.
```

## 📜 Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview the production build locally

---

## 🧰 Guidelines & Best Practices

- ✅ Colocate files by feature
- ✅ Keep shared logic minimal and reusable
- ✅ Use TypeScript with `strict` mode
- ✅ Use path aliases via `tsconfig.json` (e.g., `@/features`, `@/shared`)
- ✅ Lint & format with ESLint + Prettier

### Axios (API Client)

- ✅ Centralize your Axios instance
    - Create a shared Axios instance in `shared/api/axiosInstance.ts` with base config.

```ts
// apiClient.js
import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'https://your-api-url.com',
    timeout: 10000, // 10s timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;

```

- ✅ Use the instance across your app:

```ts
import axios from './apiClient';

const fetchUser = (id) => apiClient.get(`/users/${id}`);
```

- ✅ Add interceptors for:
    - Injecting auth token
    - Handling global error cases

```ts
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    response => response,
    error => {
        // Handle token expiration, logging, global errors
        if (error.response?.status === 401) {
            // Optionally redirect to login
        }
        return Promise.reject(error);
    }
);

```

- ✅ Set timeouts (don’t let requests hang forever)
- ✅ Use retry strategies for transient errors (via libraries like `axios-retry`)
- ✅ In React: consider `React Query (TanStack Query)` to manage caching, retries, deduplication, etc. instead of raw
  `Axios` calls everywhere.
- ✅ Use TypeScript

```ts

interface User {
    id: number;
    name: string;
}

const fetchUser = async (id: number): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
};

```

---

### Zustand (State Management)

- ✅ Use ** feature - local Zustand stores ** unless truly global.
- ✅ Global state(e.g., user session) can live in a shared`store`.

```ts

// features/auth/store.ts
import {create} from 'zustand';

type AuthStore = {
    user: User | null;
    setUser: (user: User) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    setUser: (user) => set({user}),
}));

```

- ✅ Use functional updates when needed

```ts
increment: () => set((state) => ({count: state.count + 1}))
```

- ✅ Use selectors to avoid unnecessary re-renders

```ts
const count = useStore((state) => state.count);
```

---

### React Query (TanStack)

- ✅ Use `useQuery` for GET, `useMutation` for POST/PUT/DELETE.
- ✅ Use custom hooks per resource (place query functions inside `api.ts` in each feature).

```ts
// features/auth/api.ts
import {useQuery} from '@tanstack/react-query';
import axios from '@/shared/api/axiosInstance';

export const useCurrentUser = () =>
    useQuery(['user'], () => axios.get('/me').then(res => res.data));
```

- ✅ Choose `staleTime` Wisely, `refetchOnWindowFocus` Carefully

  `staleTime`
    - prevents unnecessary refetching.
    - If data rarely changes (ex: country list), set large `staleTime` (minutes/hours).
    - If data is very dynamic (ex: notifications), use low `staleTime` or leave it at default.

  `refetchOnWindowFocus`
    - Use `refetchOnWindowFocus` based on user experience needs.
    - Default = true — good for dynamic apps.
    - For large static data or data that is expensive to fetch → set to false.

```ts
useQuery(['countries'], fetchCountries, {staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false}) // 1 hour
```

- ✅ Use select to Shape Data

```ts
useQuery(['users'], fetchUsers, {
    select: data => data.map(user => user.name),
});
```

- ✅ Use `useInfiniteQuery` for infinite scrolling.
- ✅ Use proper `getNextPageParam`.
- ✅ Use `refetch()` to force updates (ex: after mutation),
- ✅ Use `invalidateQueries()` after mutations to refresh lists:

```ts
const queryClient = useQueryClient();
queryClient.invalidateQueries(['users']);
```

- ✅ Configure common settings globally via `QueryClient`:

```ts
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            refetchOnWindowFocus: false,
        },
    },
});
```

- ✅ Use useMutation with onMutate, onError, onSettled for smooth UX.

```ts
const mutation = useMutation(updateUser, {
    onMutate: async (newData) => {
        await queryClient.cancelQueries(['user', newData.id]);
        const previousData = queryClient.getQueryData(['user', newData.id]);
        queryClient.setQueryData(['user', newData.id], newData);
        return {previousData};
    },
    onError: (err, newData, context) => {
        queryClient.setQueryData(['user', newData.id], context.previousData);
    },
    onSettled: (data, error, variables) => {
        queryClient.invalidateQueries(['user', variables.id]);
    },
});
```

---

### Tailwind CSS

- ✅ Use Tailwind classes directly in JSX.
- ✅ Use IDE extensions like Tailwind IntelliSense for autocomplete and linting
- ✅ Prefer `clsx()` or `classnames()` for conditional classes.
- ✅ Global config is in `tailwind.config.ts`.
- ✅ Use `index.css` and `styles/theme.css` for theme. (If you use a new color, that might be used more than once, add the color in theme).

```tsx
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    Submit
</button>
```

- ✅ Split utilities logically: layout → spacing → typography → colors → effects.
- ✅ Use multi-line classes for long utility chains.

```html

<div
        class="
    flex flex-col items-center justify-center
    p-6 bg-gray-100 text-center
    rounded-lg shadow-md
  "
>
```

---

### Routing (React Router v6+)

- ✅ Routes are defined in `app/router.tsx`.

```tsx
import {createBrowserRouter} from 'react-router-dom';
import LoginPage from '@/features/auth/pages/LoginPage';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout/>,
        children: [
            {path: 'login', element: <LoginPage/>},
            // Other routes...
        ],
    },
]);
```

---

### Form (React Hook Form & Zod)

#### How to make a form

- Define schema (for Zod validation) in `shared/forms/v1.ts` (either write it yourself or generate it from OpenAPI)
- Define default values (for React Hook Form) for each schema field in `shared/forms/defaults.ts`.
- Then use them at your form...

```tsx
const methods = useForm<YourSchemaType>({
    defaultValues: yourDefaults,
    resolver: zodResolver(yourSchema),
});
```

- Add your inputs to form
    - Integrate your input components with RHF.
    - Or use `FormSection` to map your config to components. This way you don't have to integrate RHF to your input components yourself.
    - If you use `useFormContext()` or components that use it (e.g. components that start with "Form" such as `FormSection`), don't forget to wrap your form with RHF's `FormProvider`.
    - Make sure the field name you provide to RHF or `FormSection` match the position of field in your Zod schema (using dot notation).

---

## 📌 Misc Notes

- Keep Zustand stores **feature-local** unless truly shared
- Use React Query for **all server communication**
- Organize everything by **feature**, not type (no global `components/`)
- Prefer to composition over inheritance
- Use Suspense and Error Boundaries where needed
- Optional: Add testing via Vitest or Jest

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
    extends: [
        // Remove ...tseslint.configs.recommended and replace with this
        ...tseslint.configs.recommendedTypeChecked,
        // Alternatively, use this for stricter rules
        ...tseslint.configs.strictTypeChecked,
        // Optionally, add this for stylistic rules
        ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
        // other options...
        parserOptions: {
            project: ["./tsconfig.node.json", "./tsconfig.app.json"],
            tsconfigRootDir: import.meta.dirname,
        },
    },
});
```

You can also
install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x)
and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom)
for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
    plugins: {
        // Add the react-x and react-dom plugins
        "react-x": reactX,
        "react-dom": reactDom,
    },
    rules: {
        // other rules...
        // Enable its recommended typescript rules
        ...reactX.configs["recommended-typescript"].rules,
        ...reactDom.configs.recommended.rules,
    },
});
```
