---
id: what-is-aidlc
title: AI-DLCとは何か
version: common
---

<!--
  SEED SAMPLE (UW-02). This is a minimal pipeline-proving unit — short body,
  real h2 sections, one question per section. UW-08〜10 が本番15単元の本文を執筆する。
  出典は uw-07 finalized-unit-list の検証済み v2 URL(SHA固定)を使用。
-->

## AI-DLCとは

AI-DLC(AI-Driven Development Life Cycle)は、AWS が提唱する AI 駆動の開発ライフサイクルです。人間が意思決定し、AI が実行する(User decides, AI executes)という原則のもと、要件定義から運用までを一連のステージとして進めます。

## 5つのフェーズ

ライフサイクルは Initialization / Ideation / Inception / Construction / Operation の5フェーズで構成されます。各フェーズは承認ゲートで区切られ、成果物はバージョン管理された Markdown として蓄積されます。

## EngineとConductor

Engine(決定的なツール群)と Conductor(オーケストレーションを担う LLM)が協調ループを回します。Engine が状態と監査ログを管理し、Conductor がステージのプロトコルに沿って作業を進めます。
