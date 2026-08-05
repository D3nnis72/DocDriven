# Docs Tree Template

Start from this default scaffold:

```text
Docs/
├── README.md
├── human/
│   ├── overview.md
│   ├── setup.md
│   ├── commands.md
│   ├── architecture.md
│   └── adaptive files when detected:
│       ├── environment.md
│       ├── configuration.md
│       ├── services.md
│       ├── deployment.md
│       ├── troubleshooting.md
│       └── maintenance.md
├── agent/
│   ├── manifest.json
│   ├── init-scan.md
│   ├── context-map.md
│   ├── update-protocol.md
│   ├── validation.md
│   ├── writing-style.md
│   ├── naming.md
│   ├── gaps.md
│   └── routes/
│       ├── architecture.json
│       ├── features.json
│       ├── interfaces.json
│       └── operations.json
├── knowledge/
│   ├── README.md
│   ├── architecture/
│   │   └── README.md
│   ├── features/
│   │   └── README.md
│   ├── interfaces/
│   │   └── README.md
│   └── operations/
│       └── README.md
└── tmp/
    └── README.md
```

Human docs are short orientation and day-one operation. The base human docs are
defaults, not a closed contract. Adaptive human docs are generated or created
only when project evidence shows a distinct human need. The names above are
common examples; a project may need different files or fewer files.

Agent docs are protocol and routing.
`manifest.json` points to route shards. Route shards are the machine-readable
contract. `context-map.md` is the readable route view. Knowledge docs are the
canonical explanation of current truth. Tmp docs are temporary and not truth.

Before treating the scaffold as complete:

- remove or avoid docs for absent concepts
- add docs for real setup, operational, domain, or interface needs
- split docs only when it improves navigation or ownership
- record uncertain docs work in `agent/gaps.md`

Architecture docs are adaptive. The default `knowledge/architecture/README.md`
should explain the actual project structure, structural ownership, dependency
direction, configuration flow, reuse/composition rules, and durable coding
patterns. It must not force a generic folder layout. It should tell agents where
authoritative code contracts and reusable project primitives live and when a new
folder, doc, or route is justified.
