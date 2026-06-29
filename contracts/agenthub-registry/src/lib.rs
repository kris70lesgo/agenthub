#![no_std]
#![allow(unexpected_cfgs)]

extern crate alloc;

use alloc::string::String;
use odra::prelude::*;

#[odra::module]
pub struct AgentHubRegistry {
    agent_publishers: Mapping<String, String>,
    agent_versions: Mapping<String, String>,
    agent_registered: Mapping<String, bool>,
    workflow_executions: Mapping<String, String>,
    workflow_timestamps: Mapping<String, u64>,
    workflow_versions: Mapping<String, String>,
    reputations: Mapping<String, u64>,
    execution_counts: Mapping<String, u64>,
    successful_executions: Mapping<String, u64>,
}

#[odra::module]
impl AgentHubRegistry {
    pub fn register_agent(&mut self, agent_id: String, publisher: String, version: String) {
        self.agent_publishers.set(&agent_id, publisher);
        self.agent_versions.set(&agent_id, version);
        self.agent_registered.set(&agent_id, true);
    }

    pub fn publish_version(&mut self, agent_id: String, version: String) {
        self.agent_versions.set(&agent_id, version);
    }

    pub fn record_workflow(
        &mut self,
        workflow_hash: String,
        execution_hash: String,
        timestamp: u64,
        version: String,
    ) {
        self.workflow_executions
            .set(&workflow_hash, execution_hash);
        self.workflow_timestamps.set(&workflow_hash, timestamp);
        self.workflow_versions.set(&workflow_hash, version);
    }

    pub fn update_reputation(&mut self, agent_id: String, reputation: u64) {
        self.reputations.set(&agent_id, reputation);
    }

    pub fn record_execution(&mut self, agent_id: String, successful: bool) {
        let count = self.execution_counts.get_or_default(&agent_id);
        self.execution_counts.set(&agent_id, count + 1);

        if successful {
            let successes = self.successful_executions.get_or_default(&agent_id);
            self.successful_executions.set(&agent_id, successes + 1);
        }
    }

    pub fn get_agent(&self, agent_id: String) -> String {
        let publisher = self.agent_publishers.get(&agent_id).unwrap_or_default();
        let version = self.agent_versions.get(&agent_id).unwrap_or_default();
        let registered = self.agent_registered.get_or_default(&agent_id);
        format!("{}|{}|{}|{}", agent_id, publisher, version, registered)
    }

    pub fn get_workflow(&self, workflow_hash: String) -> String {
        let execution_hash = self
            .workflow_executions
            .get(&workflow_hash)
            .unwrap_or_default();
        let timestamp = self.workflow_timestamps.get_or_default(&workflow_hash);
        let version = self.workflow_versions.get(&workflow_hash).unwrap_or_default();
        format!(
            "{}|{}|{}|{}",
            workflow_hash, execution_hash, timestamp, version
        )
    }

    pub fn get_reputation(&self, agent_id: String) -> String {
        let reputation = self.reputations.get_or_default(&agent_id);
        let executions = self.execution_counts.get_or_default(&agent_id);
        let successes = self.successful_executions.get_or_default(&agent_id);
        format!("{}|{}|{}|{}", agent_id, reputation, executions, successes)
    }
}
