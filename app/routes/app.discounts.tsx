import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { format } from "date-fns";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Button,
  DataTable,
  Text,
  Badge,
  InlineStack,
  Select,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { getDiscountViews } from "../services/discount.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const discounts = await getDiscountViews(request);
  return json({ discounts });
};

export default function DiscountsPage() {
  const { discounts } = useLoaderData<typeof loader>();
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];

  const rows = discounts
    .filter(discount => {
      if (filterType === 'active') return discount.isActive;
      if (filterType === 'inactive') return !discount.isActive;
      return true;
    })
    .filter(discount => 
      discount.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map(discount => [
      discount.name,
      format(new Date(discount.startDate), 'dd/MM/yyyy'),
      discount.endDate ? format(new Date(discount.endDate), 'dd/MM/yyyy') : '-',
      discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`,
      discount.productCount,
      `$${discount.totalDiscount.toFixed(2)}`,
      <Badge status={discount.isActive ? "success" : "critical"}>
        {discount.isActive ? "Active" : "Inactive"}
      </Badge>,
      <InlineStack gap="200">
        <Button size="slim">Edit</Button>
        <Button size="slim" tone="critical">
          {discount.isActive ? "Deactivate" : "Activate"}
        </Button>
      </InlineStack>,
    ]);

  return (
    <Page
      primaryAction={
        <Button variant="primary" url="/app/discounts/new">
          Create discount
        </Button>
      }
    >
      <TitleBar
        title="Discount Manager"
        primaryAction={{
          content: 'Create Discount',
          onAction: () => window.location.href = '/app/discounts/new',
        }}
      />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Select
                    label="Filter by status"
                    options={filterOptions}
                    value={filterType}
                    onChange={setFilterType}
                    labelInline
                  />
                  <TextField
                    label="Search discounts"
                    value={searchTerm}
                    onChange={setSearchTerm}
                    labelInline
                  />
                </InlineStack>
                {rows.length > 0 ? (
                  <DataTable
                    columnContentTypes={[
                      "text",
                      "text",
                      "text",
                      "text",
                      "numeric",
                      "numeric",
                      "text",
                      "text",
                    ]}
                    headings={[
                      "Name",
                      "Start Date",
                      "End Date",
                      "Discount",
                      "Products",
                      "Total Savings",
                      "Status",
                      "Actions",
                    ]}
                    rows={rows}
                  />
                ) : (
                  <BlockStack gap="200" align="center">
                    <Text as="p" variant="bodyMd">
                      No discounts found
                    </Text>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Summary
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Total Discounts
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {discounts.length}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Active Discounts
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {discounts.filter(d => d.isActive).length}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Total Products
                      </Text>
                      <Text as="span" variant="bodyMd">
                        {discounts.reduce((sum, d) => sum + d.productCount, 0)}
                      </Text>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Total Savings
                      </Text>
                      <Text as="span" variant="bodyMd">
                        ${discounts.reduce((sum, d) => sum + d.totalDiscount, 0).toFixed(2)}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}