# StreetLens Options – Java Starter

This is a **Java-only** scaffold for an options screener/pricer. A `python/` folder is reserved for later, but there’s **no Python code yet**.

## How to open (VS Code recommended)
1. Install VS Code + Dev Containers extension.
2. Open the folder and **Reopen in Container** (or run locally).

## Run locally (without container)
```bash
cd java
mvn -q -DskipTests package
java -cp target/streetlens-options-0.1.0.jar com.streetlens.options.app.Main
```

## Layout
```
streetlens/
├─ java/ (Maven project)
│  └─ src/main/java/com/streetlens/options/...
├─ python/ (empty placeholder for future work)
└─ .devcontainer/ (Java+Python dev environment)
```

## Notes
- Market data ingestion interfaces are defined but not implemented.
- No Python substitutes for data science—add them later inside `python/`.
