import { json, type ActionFunctionArgs } from "@remix-run/node";
import { Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Button,
  Select,
  TextField,
  DatePicker,
  InlineStack,
  Text,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { createDiscountRule } from "../services/discount.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const data = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    type: formData.get("type") as "percentage" | "fixed_amount",
    value: parseFloat(formData.get("value") as string),
    startDate: new Date(formData.get("startDate") as string),
    endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
    filters: JSON.parse(formData.get("filters") as string),
  };

  await createDiscountRule(request, data);
  return json({ status: "success" });
};

export default function NewDiscountPage() {
  const [selectedFilterType, setSelectedFilterType] = useState("vendor");
  const [filterValue, setFilterValue] = useState("");
  const [filters, setFilters] = useState<Array<{ type: string; value: string }>>([]);

  const handleAddFilter = () => {
    if (filterValue) {
      setFilters([...filters, { type: selectedFilterType, value: filterValue }]);
      setFilterValue("");
    }
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  return (
    <Page
      backAction={{ content: "Discounts", url: "/app/discounts" }}
    >
      <TitleBar
        title="Create New Discount"
        primaryAction={{
          content: 'Back to Discounts',
          onAction: () => window.location.href = '/app/discounts',
        }}
      />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Form method="post">
              <Card>
                <BlockStack gap="400">
                  <TextField
                    label="Discount Name"
                    type="text"
                    name="name"
                    autoComplete="off"
                    required
                  />
                  <TextField
                    label="Description"
                    type="text"
                    name="description"
                    multiline={3}
                    autoComplete="off"
                  />
                  <Select
                    label="Discount Type"
                    name="type"
                    options={[
                      { label: "Percentage", value: "percentage" },
                      { label: "Fixed Amount", value: "fixed_amount" },
                    ]}
                  />
                  <TextField
                    label="Discount Value"
                    type="number"
                    name="value"
                    autoComplete="off"
                    required
                  />
                  <TextField
                    label="Start Date"
                    type="date"
                    name="startDate"
                    autoComplete="off"
                    required
                  />
                  <TextField
                    label="End Date (Optional)"
                    type="date"
                    name="endDate"
                    autoComplete="off"
                  />
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h3">
                      Filters
                    </Text>
                    <InlineStack gap="200" align="start">
                      <Select
                        label="Filter Type"
                        options={[
                          { label: "Vendor", value: "vendor" },
                          { label: "Tag", value: "tag" },
                          { label: "Product", value: "product" },
                        ]}
                        value={selectedFilterType}
                        onChange={setSelectedFilterType}
                        labelInline
                      />
                      <TextField
                        label="Filter Value"
                        value={filterValue}
                        onChange={setFilterValue}
                        autoComplete="off"
                        labelInline
                      />
                      <Button onClick={handleAddFilter}>Add Filter</Button>
                    </InlineStack>
                    {filters.length > 0 && (
                      <BlockStack gap="200">
                        {filters.map((filter, index) => (
                          <InlineStack key={index} align="space-between">
                            <Text as="span">
                              {filter.type}: {filter.value}
                            </Text>
                            <Button
                              tone="critical"
                              variant="plain"
                              onClick={() => handleRemoveFilter(index)}
                            >
                              Remove
                            </Button>
                          </InlineStack>
                        ))}
                      </BlockStack>
                    )}
                    <input
                      type="hidden"
                      name="filters"
                      value={JSON.stringify(filters)}
                    />
                  </BlockStack>
                  <InlineStack align="end">
                    <Button submit variant="primary">
                      Create Discount
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Form>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    About Discounts
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Create a discount rule to automatically adjust product prices based on:
                  </Text>
                  <ul style={{ paddingLeft: "20px" }}>
                    <li>Specific products</li>
                    <li>Product vendors</li>
                    <li>Product tags</li>
                  </ul>
                  <Banner status="info">
                    Original prices will be saved and can be restored at any time.
                  </Banner>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}