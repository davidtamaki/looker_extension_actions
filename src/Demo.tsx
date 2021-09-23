// Copyright 2021 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useContext, useEffect, useState } from "react";
import {
  Box2,
  Button,
  CodeBlock,
  ComponentsProvider,
  Fieldset,
  FieldSelect,
  FieldText,
  Flex,
  FlexItem,
  Select,
  Space,
  Text,
} from "@looker/components";
import {
  ExtensionContext,
  ExtensionContextData,
} from "@looker/extension-sdk-react";
import { IDataActionFormField, IIntegration } from "@looker/sdk";

interface FormParams {
  [key: string]: string;
}

let formFields: IDataActionFormField[];
let actionsList: IIntegration[];
let formParams: FormParams = {};

export const Demo: React.FC = () => {
  const extensionContext = useContext<ExtensionContextData>(ExtensionContext);
  const { core40SDK } = extensionContext;

  // for query builder
  const [model, setModel] = useState("google_analytics_360");
  const [explore, setExplore] = useState("ga_sessions");
  const [fields, setFields] = useState(
    "user_sales_data.users_email, user_sales_data.users_city, user_sales_data.users_state, user_sales_data.users_country, user_sales_data.users_zip"
  );
  const [limit, setLimit] = useState("20");

  // for query running
  const [query, setQuery] = useState("");
  const [results, setResults] = useState("");

  // action hub integration destination
  const [actionDestinations, setActionDestinations] = useState(actionsList);
  const [destinationSelect, setDestinationSelect] = useState("");
  const [actionFormFields, setActionFormFields] = useState(formFields);
  const [actionInitFormParams, setInitActionFormParams] = useState(formParams);
  const [actionFormParams, setActionFormParams] = useState(formParams);

  // list all enabled AH destinations and format for Select component
  const getIntegrations = async () => {
    const actionDestinations = await core40SDK.ok(
      core40SDK.all_integrations({})
    );
    const actionNames = actionDestinations
      .filter((a) => a.enabled)
      .map((a) => {
        return { label: a.label, value: a.id! };
      });

    setActionDestinations(actionNames);
    console.log(actionDestinations);
  };

  // run query based off FieldText inputs
  const runQuery = async () => {
    const fieldsArray = fields.split(",");
    const createQuery = await core40SDK.ok(
      core40SDK.create_query({
        limit: limit,
        model: model,
        view: explore,
        fields: fieldsArray,
      })
    );

    try {
      const runQuery = await core40SDK.ok(
        core40SDK.run_query({
          query_id: createQuery.id!,
          result_format: "json_detail",
        })
      );
      console.log(createQuery);
      console.log(runQuery);
      setQuery(JSON.stringify(createQuery));
      setResults(JSON.stringify(runQuery, null, 4));
    } catch (e) {
      setResults("Error running query. Check query params");
    }
  };

  // get the form for the AH destination selected
  const getForm = async () => {
    const form = await core40SDK.ok(
      core40SDK.fetch_integration_form(destinationSelect, actionFormParams)
    );
    const formParams: any = form.fields!.reduce(
      (obj, item) => ({ ...obj, [item.name!]: "" }),
      {}
    );

    console.log(form);
    console.log(formParams);
    setInitActionFormParams(formParams);
    setActionFormFields(form.fields!);
  };

  // send to the destination with form params
  const sendDestination = async () => {
    const currentTimestamp = new Date(Date.now()).toLocaleString();
    const name = `Sent from Extension - ${currentTimestamp}`;
    const destination = `looker-integration://${destinationSelect}`;

    try {
      await core40SDK.ok(
        core40SDK.scheduled_plan_run_once({
          name: name,
          query_id: JSON.parse(query).id,
          scheduled_plan_destination: [
            // { type: "email", address: "someone@something.com", format: "csv" },
            {
              type: destination,
              format: "json_detail_lite_stream",
              parameters: JSON.stringify(actionFormParams),
            },
          ],
        })
      );
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    getIntegrations();
  }, []);

  return (
    <ComponentsProvider>
      <Box2>
        <Flex justifyContent="space-between">
          {/* query parameters */}
          <Flex width="30%" bg="keySubtle" p="u3">
            <Fieldset legend="1. Enter Query Options and Run">
              <FieldText
                label="Model"
                value={model}
                onChange={(e: any) => setModel(e.target.value)}
              />
              <FieldText
                label="Explore"
                value={explore}
                onChange={(e: any) => setExplore(e.target.value)}
              />
              <FieldText
                label="Fields"
                value={fields}
                onChange={(e: any) => setFields(e.target.value)}
              />
              <FieldText
                label="Limit"
                value={limit}
                onChange={(e: any) => setLimit(e.target.value)}
              />
              <FlexItem m="u3">
                <Button onClick={runQuery}>Run</Button>
              </FlexItem>
            </Fieldset>
          </Flex>

          {/* run and send query */}
          <Flex width="20%" bg="keySubtle" p="u3">
            <Fieldset legend="2. Select Destination and Get Form">
              <FlexItem m="u3">
                <Select
                  maxWidth={450}
                  options={actionDestinations}
                  value={destinationSelect}
                  onChange={setDestinationSelect}
                  placeholder="Choose action"
                />
              </FlexItem>
              <FlexItem m="u3">
                <Button onClick={getForm}>Get Form</Button>
              </FlexItem>
            </Fieldset>
          </Flex>

          {/* oauth form stuff */}
          <Flex width="30%" bg="keySubtle" p="u3">
            <Fieldset legend="3. Enter Form Params and Send">
              {actionFormFields ? (
                <>
                  <DisplayActionForm
                    actionFormFields={actionFormFields}
                    actionInitFormParams={actionInitFormParams}
                    setActionFormParams={setActionFormParams}
                    getForm={getForm}
                    sendDestination={sendDestination}
                  />
                </>
              ) : (
                <></>
              )}
            </Fieldset>
          </Flex>
        </Flex>
      </Box2>

      <Box2 height="20px"></Box2>

      <Space stretch={true} around>
        {results ? <CodeBlock fontSize="small">{results}</CodeBlock> : <></>}
      </Space>
    </ComponentsProvider>
  );
};

// render form fields and oauth login for user input
const DisplayActionForm = (props: any) => {
  const extensionContext = useContext<ExtensionContextData>(ExtensionContext);
  const { extensionSDK } = extensionContext;

  const [actionFormParams, setActionFormParams] = useState(
    props.actionInitFormParams
  );

  const onChangeFormSelectParams = (key: string, e: any, fieldType: string) => {
    let params = JSON.parse(JSON.stringify(actionFormParams));
    params[key] = fieldType === "text" ? e.target.value : e;
    setActionFormParams(params);
    props.setActionFormParams(params);
  };

  return (
    <>
      {props.actionFormFields.map((f: IDataActionFormField) => {
        // render string field(text or textarea)
        if (f.type === "string" || f.type === "textarea" || f.type === null) {
          return (
            <FieldText
              name={f.name}
              description={f.description}
              required={f.required}
              label={f.label}
              key={f.name}
              onChange={(e: any) =>
                onChangeFormSelectParams(f.name!, e, "text")
              }
              onBlur={f.interactive ? props.getForm : null}
              value={actionFormParams[f.name!]}
            />
          );

          // render select field
        } else if (f.type === "select") {
          const formOptions = f.options!.map((o) => {
            return { value: o.name, label: o.label };
          });

          return (
            <FieldSelect
              name={f.name}
              description={f.description}
              required={f.required}
              label={f.label}
              key={f.name}
              onChange={(e: string) =>
                onChangeFormSelectParams(f.name!, e, "select")
              }
              onBlur={f.interactive ? props.getForm : null}
              value={actionFormParams[f.name!]}
              options={formOptions}
              placeholder=""
              isClearable
            />
          );

          // show login button instead if user is not authenticated
        } else if (f.type === "oauth_link" || f.type === "oauth_link_google") {
          return (
            <Button
              key={f.name}
              value={actionFormParams[f.name!]}
              onClick={() => {
                extensionSDK.openBrowserWindow(f.oauth_url!, "_blank");
                setTimeout(props.getForm, 3000); // reload form after 3 seconds
              }}
            >
              {f.label}
            </Button>
          );
        }
      })}

      {/* hide send button if user is not authenticated */}
      {props.actionFormFields[0].type === "oauth_link" ||
      props.actionFormFields[0].type === "oauth_link_google" ? (
        <Text>{props.actionFormFields[0].description}</Text>
      ) : (
        <FlexItem m="u3">
          <Button onClick={props.sendDestination}>Send to Action</Button>
        </FlexItem>
      )}
    </>
  );
};
