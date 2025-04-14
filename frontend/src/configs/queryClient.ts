import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Extract base URL and params
    const [baseUrl, ...params] = queryKey as string[];
    
    // Handle query parameters if they exist
    let url = baseUrl;
    if (params.length > 0) {
      // If there's a single parameter and no specific key mentioned, assume it's for the URL path
      const queryParams = new URLSearchParams();
      
      // If we have two or more parameters, treat them as key-value pairs
      if (params.length >= 2 && typeof params[0] === 'string' && !params[0].includes('=')) {
        for (let i = 0; i < params.length; i += 2) {
          if (i + 1 < params.length && params[i] && params[i+1]) {
            queryParams.append(params[i] as string, params[i+1] as string);
          }
        }
      } 
      // Otherwise, use the first parameter as the value for 'address'
      else if (params[0]) {
        queryParams.append('address', params[0] as string);
      }
      
      // Append query parameters to URL if we have any
      const queryString = queryParams.toString();
      if (queryString) {
        url = `${baseUrl}?${queryString}`;
      }
    }
    
    console.log("Making API request to:", url);
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
