application: extension_actions_example {
  label: "Extension Actions Demo"
  url: "http://localhost:8080/bundle.js"
  entitlements: {
    local_storage: no
    navigation: yes
    new_window: yes
    new_window_external_urls: ["https://actions.looker.com"] # to kick off oauth flow (add any additional action hub domains)
    use_form_submit: yes
    use_embeds: yes
    core_api_methods: ["create_query", "run_query", "scheduled_plan_run_once", "all_integrations", "fetch_integration_form"]
  }
}
