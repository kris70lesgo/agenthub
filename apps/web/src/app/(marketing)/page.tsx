"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Box,
  GitBranch,
  ShieldCheck,
  Workflow,
  Zap,
} from "lucide-react";
import Link from "next/link";

const pillars = [
  {
    icon: Box,
    index: "01",
    title: "Publish",
    text: "Package agents with versioned capabilities, interfaces, and verifiable provenance.",
  },
  {
    icon: GitBranch,
    index: "02",
    title: "Compose",
    text: "Build multi-agent workflows that remain observable from intent to settlement.",
  },
  {
    icon: ShieldCheck,
    index: "03",
    title: "Trust",
    text: "Use Casper for identity, reputation, attestations, history, and payments.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex max-w-[1480px] items-center justify-between border-x border-b border-white/10 px-5 py-4 md:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid size-9 place-items-center bg-[var(--signal)] font-mono text-sm font-bold text-black">
            AH
          </span>
          <span className="font-display text-xl">AgentHub</span>
        </Link>
        <Link
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-white"
          href="/dashboard"
        >
          Enter platform <ArrowRight className="ml-2 inline" size={13} />
        </Link>
      </nav>
      <section className="mx-auto grid min-h-[72vh] max-w-[1480px] border-x border-white/10 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="flex flex-col justify-center border-b border-white/10 p-6 md:p-12 lg:border-b-0 lg:border-r">
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--signal)]"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.5 }}
          >
            Infrastructure for autonomous work
          </motion.p>
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="font-display mt-8 max-w-5xl text-balance text-6xl leading-[0.92] md:text-8xl xl:text-[7.5rem]"
            initial={{ opacity: 0, y: 26 }}
            transition={{ delay: 0.08, duration: 0.7 }}
          >
            The Operating System for the{" "}
            <em className="text-[var(--signal)]">AI Agent Economy</em>
          </motion.h1>
          <motion.div
            animate={{ opacity: 1 }}
            className="mt-10 flex flex-col gap-6 md:flex-row md:items-center"
            initial={{ opacity: 0 }}
            transition={{ delay: 0.28 }}
          >
            <Link
              className="inline-flex w-fit items-center gap-3 bg-[var(--signal)] px-5 py-3 text-sm font-bold text-black"
              href="/dashboard"
            >
              Explore Marketplace <ArrowRight size={16} />
            </Link>
            <p className="max-w-md text-sm leading-6 text-[var(--muted)]">
              Discover, compose, deploy and govern autonomous AI agents with
              Casper-powered trust.
            </p>
          </motion.div>
        </div>
        <div className="relative min-h-[420px] p-6 md:p-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            Network topology / live concept
          </p>
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative size-72 rounded-full border border-white/10 md:size-96">
              <div className="absolute inset-12 rounded-full border border-dashed border-white/15" />
              <div className="absolute inset-0 m-auto grid size-24 place-items-center bg-[var(--signal)] font-mono text-xs font-bold text-black">
                CASPER
              </div>
              {["IDENTITY", "WORKFLOW", "PAYMENT", "REPUTATION"].map(
                (label, index) => (
                  <div
                    className="absolute bg-[#101514] p-3 font-mono text-[9px] tracking-widest text-[var(--muted)]"
                    key={label}
                    style={{
                      left: index % 2 ? "72%" : "-4%",
                      top: index < 2 ? "20%" : "72%",
                    }}
                  >
                    {label}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1480px] border-x border-t border-white/10 md:grid-cols-3">
        {pillars.map(({ icon: Icon, index, title, text }) => (
          <article
            className="border-b border-white/10 p-7 md:border-r md:p-9"
            key={title}
          >
            <div className="flex items-center justify-between text-[var(--muted)]">
              <Icon size={20} />
              <span className="font-mono text-[10px]">{index}</span>
            </div>
            <h2 className="font-display mt-16 text-4xl">{title}</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--muted)]">
              {text}
            </p>
          </article>
        ))}
      </section>
      <section className="mx-auto max-w-[1480px] border-x border-white/10 px-6 py-24 md:px-12">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.24em] text-[var(--signal)]">
              The problem
            </p>
            <h2 className="font-display mt-4 text-5xl">
              Agents are powerful. Their ecosystem is fragmented.
            </h2>
          </div>
          <p className="self-end text-lg leading-8 text-[var(--muted)]">
            Teams lack a shared place to discover trusted agents, understand
            performance, compose workflows, govern execution, and distribute
            value. AgentHub brings those surfaces into one legible system.
          </p>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1480px] border-x border-y border-white/10 lg:grid-cols-3">
        {[
          [
            "01",
            "Discover",
            "Search a curated marketplace by capability, reputation, speed, and cost.",
          ],
          [
            "02",
            "Compose",
            "Connect specialist agents into observable workflows without hiding the system.",
          ],
          [
            "03",
            "Govern",
            "Prepare identity, attestations, version history, and payments for Casper verification.",
          ],
        ].map(([index, title, text]) => (
          <article
            className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r"
            key={title}
          >
            <span className="font-mono text-[10px] text-[var(--signal)]">
              {index}
            </span>
            <h3 className="font-display mt-20 text-4xl">{title}</h3>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{text}</p>
          </article>
        ))}
      </section>
      <section className="mx-auto max-w-[1480px] border-x border-white/10 p-6 py-24 md:p-12">
        <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[var(--signal)]">
              Architecture
            </p>
            <h2 className="font-display mt-4 text-5xl">
              One control plane. Clear boundaries.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [Box, "Agent registry"],
              [Workflow, "Workflow orchestration"],
              [Zap, "Observable runtime"],
              [ShieldCheck, "Casper trust layer"],
            ].map(([Icon, label]) => (
              <div
                className="flex min-h-36 items-end justify-between border border-white/10 bg-white/[.02] p-5"
                key={label as string}
              >
                <span className="text-sm">{label as string}</span>
                <Icon size={20} className="text-[var(--signal)]" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1480px] border-x border-t border-white/10 p-6 py-20 md:p-12">
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-[var(--signal)]">
          What early teams say
        </p>
        <blockquote className="font-display mt-8 max-w-5xl text-4xl leading-tight md:text-6xl">
          “AgentHub makes an autonomous system feel inspectable—like
          infrastructure we can actually operate.”
        </blockquote>
        <p className="mt-6 text-sm text-[var(--muted)]">
          AI operations lead · enterprise workflow platform
        </p>
      </section>
      <section className="mx-auto max-w-[1480px] border-x border-t border-white/10 p-6 py-20 md:p-12">
        <h2 className="font-display text-5xl">Frequently asked</h2>
        <div className="mt-10 divide-y divide-white/10">
          {[
            [
              "Is AgentHub another chatbot?",
              "No. It is infrastructure for publishing, composing, operating, and governing AI agents.",
            ],
            [
              "Does this demo execute agents?",
              "Yes. AgentHub executes structured multi-agent workflows through NVIDIA NIM and streams the run into the existing runtime UI.",
            ],
            [
              "Where does Casper fit?",
              "Casper stores compact trust artifacts: agent identity, workflow hashes, execution hashes, versions, and reputation updates.",
            ],
          ].map(([question, answer]) => (
            <details className="py-5" key={question}>
              <summary className="cursor-pointer text-lg">{question}</summary>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>
      <footer className="mx-auto flex max-w-[1480px] flex-col justify-between gap-6 border-x border-t border-white/10 p-6 md:flex-row md:items-end md:p-12">
        <div>
          <span className="font-display text-2xl">AgentHub</span>
          <p className="mt-2 text-sm text-[var(--muted)]">
            The operating system for the AI Agent Economy.
          </p>
        </div>
        <div className="flex gap-5 text-xs text-[var(--muted)]">
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/workflows">Launch Studio</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </footer>
    </main>
  );
}
