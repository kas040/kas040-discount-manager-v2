import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import createApp from "@shopify/app-bridge";
import { Provider } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "", host: process.env.SHOPIFY_APP_HOST || "" };
};

export default function App() {
  const { apiKey, host } = useLoaderData<typeof loader>();

  const appBridgeConfig = {
    apiKey,
    host,
    forceRedirect: true,
  };

  const app = createApp(appBridgeConfig);

  return (
    <Provider config={appBridgeConfig} app={app}>
      <Outlet />
    </Provider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
