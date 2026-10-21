import { prototypeArtifacts, prototypeRelease } from './release';

export function documentationGroups() { return [
  {
    title: `Current ${prototypeRelease.series} guidance`,
    description: 'Start with the implemented workflows and their limits.',
    links: [
      { title: `${prototypeRelease.series} ${prototypeRelease.tag ? 'release record' : 'local baseline'}`, href: prototypeArtifacts.currentBaseline, detail: 'Current scope, validation, and known limits.' },
      { title: 'Product and workflow guide', href: prototypeArtifacts.workflows, detail: 'Page purposes, responsibilities, process steps, and diagrams.' },
      { title: 'Requirements and limits', href: prototypeArtifacts.requirements, detail: 'Implemented behavior, planned integrations, and unresolved policy.' },
      { title: 'Detection Coverage and Risk Buckets', href: 'v1.2-risk-and-coverage.md', detail: 'Evidence support, retained categories, finding outcomes, and Review-case actions.' },
      { title: 'Shared terminology', href: 'GLOSSARY.md', detail: 'One meaning for each role, status, and evidence term.' },
      { title: 'Verification record', href: prototypeArtifacts.verification, detail: 'Checks performed, evidence, and remaining limits.' },
    ],
  },
  {
    title: `Platform delivery · input schema ${prototypeRelease.collectionContract}`,
    description: `Workbook revision ${prototypeRelease.workbookRevision} simplifies guidance. Input schema ${prototypeRelease.collectionContract} keeps the existing headers, native identities, and queries.`,
    links: [
      { title: 'Excel extract workbook', href: prototypeArtifacts.workbook, detail: '16 sheets: 11 input tables, one guide, 72 common definitions, and three platform mappings.' },
      { title: 'Platform manager handoff', href: prototypeArtifacts.handoff, detail: 'Tableau PostgreSQL, Alteryx SQL Server exports, and Fabric inventory.' },
      { title: 'Query and collection pack', href: prototypeArtifacts.collectionPack, detail: 'Current workbook and source queries with a file manifest. Installed-platform validation remains required.' },
      { title: 'Column dictionary', href: prototypeArtifacts.dictionary, detail: '72 common field definitions. Each platform output tab supplies its source, value, and NULL rules.' },
      { title: 'Monthly reconciliation', href: prototypeArtifacts.collectionRoot + 'monthly-reconciliation.md', detail: 'Identity, partial coverage, unresolved people, and protected history.' },
    ],
  },
  {
    title: 'Earlier designs and decisions',
    description: 'Historical context. Use the current guide when workflow descriptions differ.',
    links: [
      { title: 'V1.2 local baseline', href: 'v1.2-baseline.md', detail: 'Preserved account of the earlier local snapshot.' },
      { title: 'V1.1 baseline', href: prototypeArtifacts.baseline, detail: 'Earlier release scope and design assumptions.' },
      { title: 'Model simplification design', href: prototypeArtifacts.model, detail: 'Earlier model proposal, not a deployed SQL schema.' },
      { title: 'Earlier decision register', href: prototypeArtifacts.decisions, detail: 'Decision history. Later approved page decisions take precedence.' },
    ],
  },
] as const; }

export const workflowGuides = [
  { title: 'Workspace requests', href: '#/requests', summary: 'Declare business responsibility and content. Add technical setup only when needed.', detail: 'Three form steps for business-only changes; five for technical requests. Decisions and implementation evidence follow submission.' },
  { title: 'Asset evaluations', href: '#/assets', summary: 'A current Champion records business context and a completed evaluation.', detail: 'Four steps. PRL is calculated. No saved evaluation draft, asset approval queue, or asset Annual Attestation.' },
  { title: 'My work', href: '#/reviews', summary: 'Follow assigned Reviews, Findings, and workspace Annual Attestation.', detail: 'Review and annual forms each have three steps. A High risk qualification does not itself create a Review.' },
  { title: 'Platform imports', href: '#/imports', summary: 'Inspect the five-step evidence walkthrough and platform query references.', detail: 'Receive, Validate, Match, Compare, Accept. Live acceptance is not connected; SQL staging remains a manual handoff.' },
] as const;

export function documentationCopies() { return [
  ['docs/' + prototypeArtifacts.currentBaseline, prototypeArtifacts.currentBaseline],
  ['docs/v1.2-baseline.md', 'v1.2-baseline.md'],
  ['docs/diagrams/v1.2-relationships.svg', 'diagrams/v1.2-relationships.svg'],
  ['docs/diagrams/v1.2-evidence-flow.svg', 'diagrams/v1.2-evidence-flow.svg'],
  ['docs/v1.2-guide.md', prototypeArtifacts.workflows],
  ['docs/v1.2-requirements.md', prototypeArtifacts.requirements],
  ['docs/v1.2-risk-and-coverage.md', 'v1.2-risk-and-coverage.md'],
  ['docs/' + prototypeArtifacts.verification, prototypeArtifacts.verification],
  ['docs/v1.2-verification.md', 'v1.2-verification.md'],
  ['GLOSSARY.md', 'GLOSSARY.md'],
  ['docs/business-product.md', 'business-product.md'],
  ['docs/requirements.md', 'requirements.md'],
  ['docs/decision-register.md', prototypeArtifacts.decisions],
  ['docs/v1.1-approved-workflows.md', 'v1.1-approved-workflows.md'],
  ['docs/v1.1-model-simplification.md', prototypeArtifacts.model],
  ['docs/v1.1-request-module.md', 'v1.1-request-module.md'],
] as const; }
