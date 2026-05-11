# Investigation Board — Foundry v14 → v13 Downgrade Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever o módulo Investigation Board para rodar em Foundry VTT v13.351 como única versão alvo, removendo todo o uso de APIs/hooks exclusivos da v14 e portando todas as features atuais (Document Notes, Video Player, etc.) para mecanismos compatíveis com v13.

**Architecture:** Reverter mudanças mecânicas v14 (PrimaryGraphics em `canvas.primary.addDrawing`, `this.controls` para handles, `getFolderContextOptions`, `getHeaderControlsImagePopout`, etc.) para os equivalentes v13 (`this` como container, `this.frame.handleContainer`, hooks por tipo de diretório, `renderImagePopout`). Estrutura de arquivos é mantida — apenas conteúdo é alterado. Cada fase deixa o módulo em estado funcional testável.

**Tech Stack:** Foundry VTT v13.351, JavaScript ES modules, PIXI.js 7, Handlebars, ApplicationV2 (já existe em v13).

**Estratégia de teste:** Após cada fase com checkpoint `🧪 TESTAR`, recarregue o Foundry v13 com F5 e valide o comportamento descrito antes de prosseguir. Sem testes automatizados — validação 100% manual.

---

## Visão geral das fases

| Fase | Objetivo | Estado ao final |
|------|----------|-----------------|
| 0 | Pré-voo: branch, snapshot, módulo carrega | Módulo carregável (mesmo com bugs visuais) |
| 1 | Pin board mínimo: criar uma sticky note via toolbar e vê-la na tela | Sticky note renderiza |
| 2 | Renderização completa: todas as 7 types renderizam | Todos os sprites aparecem |
| 3 | Selection controls e handles em v13 | Bounding-box e handles corretos |
| 4 | Drawing sheet (edição) funciona | Diálogo de edição salva |
| 5 | Context menus dos directories | Criação por context menu funciona |
| 6 | Image popout, journal page extras | Handout Note from image popout funciona |
| 7 | Color, namespaces, refinamentos | Sem warnings/erros no console |
| 8 | Auditoria final de features | Document Notes, Video Player, Connections OK |

---

## File Structure (arquivos tocados)

Todos os arquivos **modificados** — nenhum criado nem deletado:

- `module.json` — campos `compatibility`
- `scripts/main.js` — hooks de scene controls, context menus, image popout
- `scripts/canvas/custom-drawing.js` — `this.shape` → `this`, `_refreshState` para v13, handles
- `scripts/canvas/connection-manager.js` — `foundry.utils.Color.multiplyScalar` revisão
- `scripts/apps/drawing-sheet.js` — `_prepareSubmitData` (verificar necessidade em v13)
- `scripts/apps/video-player.js` — sem mudanças esperadas (ApplicationV2 existe em v13)
- `scripts/apps/note-previewer.js` — sem mudanças esperadas
- `scripts/utils/creation-utils.js` — DialogV2 sem mudanças (existe em v13)
- `scripts/utils/helpers.js` — FilePicker namespace (verificar)

---

## Fase 0 — Pré-voo e `module.json`

### Task 0.1: Backup branch

**Files:** N/A (operação git)

- [ ] **Step 1: Confirmar branch atual e criar tag de segurança**

```bash
git status
git log -1 --oneline
git tag pre-v13-downgrade
```

Expected: tag criada apontando para o último commit v14.

- [ ] **Step 2: Commit inicial vazio para marcar começo do downgrade**

```bash
git commit --allow-empty -m "chore: start v14 → v13 downgrade"
```

---

### Task 0.2: Atualizar `module.json` para v13

**Files:**
- Modify: `module.json:14-17`

- [ ] **Step 1: Substituir bloco `compatibility`**

Trocar:

```json
  "compatibility": {
    "minimum": "13",
    "verified": "14"
  },
```

Por:

```json
  "compatibility": {
    "minimum": "13",
    "verified": "13",
    "maximum": "13"
  },
```

- [ ] **Step 2: Confirmar que `socket: true` permanece**

Verificar em `module.json:6` que a linha `"socket": true,` continua presente.

- [ ] **Step 3: 🧪 TESTAR**

Abrir Foundry v13.351. Habilitar o módulo no mundo. Esperado: módulo aparece na lista, sem aviso de incompatibilidade. **Pode quebrar ao carregar uma cena com notas** — esperado, será corrigido nas próximas fases.

- [ ] **Step 4: Commit**

```bash
git add module.json
git commit -m "chore(v13): set compatibility to v13 only"
```

---

## Fase 1 — Renderização mínima (Sticky Note funcional)

### Task 1.1: Reverter `this.shape` → `this` em `custom-drawing.js`

**Files:**
- Modify: `scripts/canvas/custom-drawing.js` (23 ocorrências entre linhas 896 e 1397)

**Contexto:** Em v14, `Drawing._draw()` cria `this.shape = canvas.primary.addDrawing(this)` (um `PrimaryGraphics` em `canvas.primary`) e todos os sprites são adicionados/removidos via `this.shape.addChild()`. Em **v13**, `Drawing` é o próprio Container PIXI — sprites vão diretamente em `this`. A propriedade `this.shape` existe em v13 mas é um `PIXI.Graphics` interno usado por `_drawShape()`, **não** é o container destino dos children customizados.

- [ ] **Step 1: Substituir todas as ocorrências de `this.shape.addChild(`, `this.shape.removeChild(`, `this.shape.addChildAt(` e `this.shape.children`**

Lista exata de linhas (de `Grep` no estado atual):

```
896:    if (this.shape.children.at(-1) !== this.stampSprite) {
898:      this.shape.addChild(this.stampSprite);
903:    if (!this.shape) return;
910:        this.shape.removeChild(this.docTitleText);
915:        this.shape.removeChild(this.docBodyText);
935:        this.shape.removeChild(this.bgSprite);
943:        this.shape.addChild(this.photoImageSprite);
949:        this.shape.addChildAt(this.bgShadow, 0);
1003:   if (this.photoImageSprite.parent) this.shape.removeChild(this.photoImageSprite);
1015:        this.shape.addChild(this.bgSprite);
1019:        this.shape.addChildAt(this.bgShadow, 0);
1068:        this.shape.addChild(this.docTitleText);
1106:        this.shape.addChild(this.docBodyText);
1123:        this.shape.removeChild(this.bgSprite);
1128:        this.shape.removeChild(this.bgShadow);
1133:        this.shape.removeChild(this.photoImageSprite);
1155:        this.shape.removeChild(this.bgSprite);
1169:        this.shape.addChild(this.photoImageSprite);
1249:      this.shape.addChild(this.bgSprite);
1255:      this.shape.addChildAt(this.bgShadow, 0);
1303:      this.shape.addChild(this.photoImageSprite);
1346:        this.shape.addChild(this.photoMask);
1397:      this.shape.addChild(this.noteText);
```

Comando para fazer todas de uma vez (do diretório do worktree, no shell Bash do Git):

```bash
# Substituir os 4 padrões em uma passada — guard line 903 antes
sed -i 's/this\.shape\.addChild(/this.addChild(/g' scripts/canvas/custom-drawing.js
sed -i 's/this\.shape\.removeChild(/this.removeChild(/g' scripts/canvas/custom-drawing.js
sed -i 's/this\.shape\.addChildAt(/this.addChildAt(/g' scripts/canvas/custom-drawing.js
sed -i 's/this\.shape\.children\.at/this.children.at/g' scripts/canvas/custom-drawing.js
```

- [ ] **Step 2: Corrigir manualmente a linha 903 (`if (!this.shape) return;`)**

`this.shape` ainda existe em v13 (é o `PIXI.Graphics` interno do drawing); o guard original quer testar se o drawing já foi `draw()`ado. Em v13 a checagem equivalente é se `this` tem um parent (foi adicionado ao layer). Editar:

```javascript
// Antes (linha ~903):
if (!this.shape) return;

// Depois:
if (this.destroyed || !this.parent) return;
```

- [ ] **Step 3: Verificar nenhuma sobra**

```bash
grep -n "this\.shape\.\(addChild\|removeChild\|addChildAt\|children\)" scripts/canvas/custom-drawing.js
```

Expected: sem matches.

- [ ] **Step 4: Remover qualquer linha que referencie `canvas.primary.addDrawing`**

```bash
grep -n "canvas\.primary\.addDrawing" scripts
```

Expected: sem matches (já não há no estado atual, mas confirmar).

---

### Task 1.2: Reverter `getSceneControlButtons` para formato v13

**Files:**
- Modify: `scripts/main.js:151-203`

**Contexto:** Em v14 o callback recebe um *objeto* `controls` com chaves nomeadas (`controls.drawings.tools.X = {..., button:true, onChange}`). Em **v13.351** o callback recebe um **array** de objetos `{ name, title, layer, tools: [...] }`. Tools são também um **array** com itens `{ name, title, icon, button, onClick }` (não `onChange`).

- [ ] **Step 1: Substituir o hook inteiro**

Trocar o bloco `Hooks.on("getSceneControlButtons", (controls) => { ... });` (linhas 151–203) por:

```javascript
Hooks.on("getSceneControlButtons", (controls) => {
  // v13: controls is an array; find the drawings entry
  const drawings = Array.isArray(controls)
    ? controls.find(c => c.name === "drawings")
    : controls.drawings;
  if (!drawings) return;

  // v13 tools is an array; v14 used an object. Support both for safety.
  const pushTool = (tool) => {
    if (Array.isArray(drawings.tools)) drawings.tools.push(tool);
    else drawings.tools[tool.name] = tool;
  };

  pushTool({
    name: "createStickyNote",
    title: "Create Sticky Note",
    icon: "fas fa-sticky-note",
    button: true,
    onClick: () => createNote("sticky")
  });
  pushTool({
    name: "createPhotoNote",
    title: "Create Photo Note",
    icon: "fa-solid fa-camera-polaroid",
    button: true,
    onClick: () => createNote("photo")
  });
  pushTool({
    name: "createIndexCard",
    title: "Create Index Card",
    icon: "fa-regular fa-subtitles",
    button: true,
    onClick: () => createNote("index")
  });
  pushTool({
    name: "createHandout",
    title: "Create Handout Note",
    icon: "fas fa-file-image",
    button: true,
    onClick: () => createNote("handout")
  });
  pushTool({
    name: "createMediaNote",
    title: "Create Media Note",
    icon: "fas fa-cassette-tape",
    button: true,
    onClick: () => createNote("media")
  });
  pushTool({
    name: "createPinOnly",
    title: "Create Pin Only",
    icon: "fas fa-thumbtack",
    button: true,
    onClick: () => createNote("pin")
  });
});
```

> **Nota:** mantenho `Document Note` fora aqui propositalmente — a tool dele não existia no v14 (era só context menu). Confira se quer adicionar; caso sim, copiar o padrão com `icon: "fas fa-scroll"` e `() => createNote("document")`.

- [ ] **Step 2: Ajustar `renderSceneControls` (linha 206)**

Em v13, o segundo argumento é diferente. Substituir o handler para usar `ui.controls.activeControl` em vez do parâmetro:

```javascript
Hooks.on("renderSceneControls", () => {
  const activeControl = ui.controls?.activeControl;
  if (activeControl === "drawings") {
    activateInvestigationBoardMode();
  } else if (InvestigationBoardState.isActive) {
    deactivateInvestigationBoardMode();
  }
});
```

---

### Task 1.3: Remover override `_prepareSubmitData` (causaria erro em v13 se não existir)

**Files:**
- Modify: `scripts/apps/drawing-sheet.js:238-245`

**Contexto:** O override foi adicionado para v14 onde `DocumentSheetV2._postRender` chama `_prepareSubmitData` e valida contra o schema. Em **v13.351** a `DrawingConfig` (AppV2) também tem esse mecanismo, mas precisa ser testado. Vamos manter por enquanto (é defensivo — retornar `{}` não causa regressão), só adicionar uma checagem extra para segurança.

- [ ] **Step 1: Manter o override mas ajustar comentário**

Substituir:

```javascript
  /**
   * Override _prepareSubmitData to prevent AppV2's DocumentSheetV2 from validating
   * IB-specific form fields (text, image, font, etc.) against the DrawingDocument
   * schema. IB handles all updates manually through the submit event handler in _onRender.
   */
  _prepareSubmitData(event, form, formData) {
    return {};
  }
```

Por:

```javascript
  /**
   * IB handles all form updates manually via the submit event handler in _onRender.
   * Returning {} prevents DocumentSheetV2 from validating IB-specific fields
   * (text, image, font, etc.) against the DrawingDocument schema.
   */
  _prepareSubmitData(event, form, formData) {
    return {};
  }
```

> Apenas atualiza comentário (remove menção a v14). Comportamento permanece.

---

### Task 1.4: 🧪 TESTAR FASE 1

- [ ] **Step 1: Recarregar Foundry v13 e validar**

1. F5 no Foundry v13.351
2. Abrir uma cena vazia
3. Clicar no controle de Drawings na sidebar
4. Verificar: 6 botões customizados aparecem na toolbar do Drawings
5. Clicar em "Create Sticky Note"
6. Verificar:
   - Uma sticky note amarela aparece no centro da viewport
   - Diálogo de edição abre
   - Não há erros no console (F12)

**Se falhar:** Capturar erros do console e revisitar Tasks 1.1–1.2.

- [ ] **Step 2: Commit**

```bash
git add scripts/main.js scripts/canvas/custom-drawing.js scripts/apps/drawing-sheet.js
git commit -m "feat(v13): minimum-viable rendering for sticky notes

- Move sprite children from this.shape (v14 PrimaryGraphics) back to this (v13 Drawing container)
- Convert getSceneControlButtons tools from object/onChange (v14) to array/onClick (v13)
- Update renderSceneControls to read ui.controls.activeControl"
```

---

## Fase 2 — Selection controls e handles em v13

### Task 2.1: Substituir `_refreshState`/`this.controls` por `_refreshFrame`/`this.frame`

**Files:**
- Modify: `scripts/canvas/custom-drawing.js:122-181`
- Modify: `scripts/canvas/custom-drawing.js:712-741` (monkey-patch em `draw()`)

**Contexto:** Em v14, `Drawing` usa `this.controls` (um `DrawingShapeControls`) com `controls.handles.children` para os handles de seleção. Em **v13.351**, drawings usam `this.frame` (um `PIXI.Container`) com `this.frame.handleContainer.children` para handles, e o método chamado a cada refresh é `_refreshFrame()`. `_refreshState()` em v13 existe mas controla apenas `this.alpha` e `this.visible` — handles ficam fora dele.

- [ ] **Step 1: Substituir bloco `_refreshState` (linhas 122–154)**

Trocar:

```javascript
  /**
   * Override _refreshState to hide selection handles for all non-handout IB notes.
   * In v14, Drawing uses DrawingShapeControls (this.controls) for selection/resize handles.
   * _refreshFrame() was deprecated in v14 and no longer called automatically.
   */
  _refreshState() {
    super._refreshState();
    const noteData = this.document.flags?.[MODULE_ID];
    if (!noteData?.type) return;

    // Handout keeps full controls — leave Foundry's defaults untouched.
    if (noteData.type === "handout") return;

    // Pin notes never show a bounding box regardless of settings.
    if (noteData.type === "pin") {
      if (this.controls) this.controls.visible = false;
      return;
    }

    if (!this.controls) return;

    const showControls = game.settings.get(MODULE_ID, "showSelectionControls");
    if (!showControls) {
      // Default behaviour: no bounding box or handles for IB notes
      this.controls.visible = false;
      return;
    }

    // Let Foundry's super manage controls.visible (hover/selected state).
    // Per-handle filtering is enforced by the patch in draw() so it survives
    // any subsequent controls._refresh() calls triggered by position/rotation changes.
    this._applyHandleVisibility();
  }
```

Por:

```javascript
  /**
   * v13: Drawing uses this.frame (PIXI.Container) with handleContainer for selection
   * handles. _refreshFrame() is called by Foundry on every refresh.
   */
  _refreshFrame(options) {
    super._refreshFrame?.(options);
    const noteData = this.document.flags?.[MODULE_ID];
    if (!noteData?.type) return;

    // Handout keeps full controls — leave Foundry defaults untouched.
    if (noteData.type === "handout") return;

    // Pin notes never show a bounding box.
    if (noteData.type === "pin") {
      if (this.frame) this.frame.visible = false;
      return;
    }

    if (!this.frame) return;

    const showControls = game.settings.get(MODULE_ID, "showSelectionControls");
    if (!showControls) {
      this.frame.visible = false;
      return;
    }

    this._applyHandleVisibility();
  }
```

- [ ] **Step 2: Substituir bloco `_applyHandleVisibility` (linhas 161–181)**

Trocar:

```javascript
  _applyHandleVisibility() {
    if (!this.controls?.handles) return;
    const allowScaling = game.settings.get(MODULE_ID, "allowScaling");
    for (const handle of this.controls.handles.children) {
      switch (handle.name) {
        case "rotate":
          handle.visible = true;
          handle.cursor = 'pointer';
          break;
        case "scale":
        case "scaleX":
        case "scaleY":
          handle.visible = allowScaling;
          handle.cursor = 'pointer';
          break;
        default: // "translate" and anything else
          handle.visible = false;
          break;
      }
    }
  }
```

Por:

```javascript
  /**
   * v13: handles live in this.frame.handleContainer.children. Each handle has a
   * `name` matching "rotate", "scale", "scaleX", "scaleY", "translate".
   */
  _applyHandleVisibility() {
    const handles = this.frame?.handleContainer?.children;
    if (!handles) return;
    const allowScaling = game.settings.get(MODULE_ID, "allowScaling");
    for (const handle of handles) {
      switch (handle.name) {
        case "rotate":
          handle.visible = true;
          handle.cursor = 'pointer';
          break;
        case "scale":
        case "scaleX":
        case "scaleY":
          handle.visible = allowScaling;
          handle.cursor = 'pointer';
          break;
        default:
          handle.visible = false;
          break;
      }
    }
  }
```

- [ ] **Step 3: Remover monkey-patch de `this.controls._refresh` em `draw()` (linhas 720–733)**

Trocar:

```javascript
    // Patch this.controls._refresh (created fresh each draw() by Foundry) so that
    // our per-handle visibility is reapplied after every Foundry controls refresh.
    // This prevents position/rotation updates from resetting handle visibility.
    const noteType = this.document.flags[MODULE_ID]?.type;
    if (this.controls && noteType && noteType !== "handout" && noteType !== "pin") {
      const originalRefresh = this.controls._refresh.bind(this.controls);
      const self = this;
      this.controls._refresh = function() {
        originalRefresh();
        if (game.settings.get(MODULE_ID, "showSelectionControls")) {
          self._applyHandleVisibility();
        }
      };
    }
```

Por (vazio — em v13 `_refreshFrame` é chamado automaticamente em cada refresh, então não precisa do monkey-patch):

```javascript
    // v13: _refreshFrame is called automatically on every refresh by Foundry,
    // so per-handle visibility is reapplied naturally. No monkey-patch needed.
```

- [ ] **Step 4: Manter `_getTargetAlpha` (já compatível com v13)**

Não tocar. Em v13 `_refreshState()` chama `this.alpha = this._getTargetAlpha()` igual à v14.

---

### Task 2.2: 🧪 TESTAR FASE 2

- [ ] **Step 1: Recarregar e validar selection controls**

1. F5 no Foundry
2. Habilitar setting `showSelectionControls = true` em Investigation Board settings
3. Criar uma sticky note, clicar nela
4. Verificar: bounding-box aparece, mas só com handle de **rotação** visível (sem scale, sem translate)
5. Habilitar `allowScaling = true`
6. Verificar: scale handles aparecem além do rotate
7. Criar uma pin-only note, clicar nela
8. Verificar: **nenhum** bounding-box aparece
9. Criar uma handout note
10. Verificar: bounding-box e handles **padrão** do Foundry aparecem (não filtrado pelo IB)

- [ ] **Step 2: Commit**

```bash
git add scripts/canvas/custom-drawing.js
git commit -m "feat(v13): use _refreshFrame and this.frame for selection handles"
```

---

## Fase 3 — Drawing sheet (já AppV2 — provavelmente OK)

`DrawingConfig` e `ApplicationV2` existem em v13.351. O sheet **deveria** funcionar sem alterações. Esta fase é apenas teste e ajustes pontuais se algo quebrar.

### Task 3.1: Validar e ajustar drawing-sheet

**Files:**
- Modify: `scripts/apps/drawing-sheet.js` (apenas se problemas surgirem)

- [ ] **Step 1: 🧪 TESTAR sheet**

1. F5
2. Criar uma sticky note
3. Verificar: diálogo de edição abre
4. Trocar texto, escolher cor, salvar
5. Verificar: nota atualiza visualmente
6. Editar nota de cada tipo (sticky, photo, index, handout, media, pin, document) e salvar
7. Para cada um: ver console e anotar **qualquer** erro

- [ ] **Step 2: Para cada erro, anotar e tratar pontualmente**

Padrões esperados de erro e fix:

- **`TextEditor.implementation undefined`** → usar `foundry.applications.ux.TextEditor.implementation ?? TextEditor` como fallback. Existe em v13.
- **`FilePicker.implementation undefined`** → fallback similar.
- **Erro de schema validation no submit** → confirmar que `_prepareSubmitData` retorna `{}` (Task 1.3 mantém isso).

> Se não houver erros, esta fase está completa.

- [ ] **Step 3: Commit (se houver mudanças)**

```bash
git add scripts/apps/drawing-sheet.js
git commit -m "fix(v13): drawing sheet API namespace fallbacks"
```

---

## Fase 4 — Context menus dos directories

### Task 4.1: Substituir `getFolderContextOptions` por hooks específicos por tipo

**Files:**
- Modify: `scripts/main.js:846-857`

**Contexto:** Em v14, todas as folders disparam o hook unificado `getFolderContextOptions`. Em **v13.351**, cada directory tem seu próprio hook:
- `getActorFolderContextOptions`
- `getItemFolderContextOptions`
- `getJournalFolderContextOptions`
- `getSceneFolderContextOptions`
- `getPlaylistFolderContextOptions`

> Nota: confirme os nomes exatos em v13.351 com `Hooks.events` no console; se o nome correto for `getActorDirectoryFolderContext`, ajuste em conformidade — o padrão `<type>FolderContextOptions` é o que v13 introduziu.

- [ ] **Step 1: Substituir o bloco do hook unificado**

Trocar:

```javascript
// Folder Context Hook — v14 fires getFolderContextOptions for all directory types
Hooks.on("getFolderContextOptions", (app, entryOptions) => {
  // Avoid duplicate entries
  if (entryOptions.find(e => e.label === "Import Folder as Notes")) return;

  entryOptions.push({
    label: "Import Folder as Notes",
    icon: "fa-solid fa-camera-polaroid",
    onClick: (event, li) => _onImportFolderAsNotes(li),
    visible: () => game.user.isGM
  });
});
```

Por:

```javascript
// v13: per-directory folder hooks
const FOLDER_HOOKS = [
  "getActorFolderContextOptions",
  "getItemFolderContextOptions",
  "getJournalFolderContextOptions",
  "getSceneFolderContextOptions",
  "getPlaylistFolderContextOptions",
];

for (const hookName of FOLDER_HOOKS) {
  Hooks.on(hookName, (app, entryOptions) => {
    if (entryOptions.find(e => e.label === "Import Folder as Notes")) return;
    entryOptions.push({
      label: "Import Folder as Notes",
      icon: "fa-solid fa-camera-polaroid",
      onClick: (event, li) => _onImportFolderAsNotes(li),
      visible: () => game.user.isGM
    });
  });
}
```

---

### Task 4.2: Adicionar `getSceneNavigationContext` para Scene Navigation

**Files:**
- Modify: `scripts/main.js:705-716`

**Contexto:** Em v14, `getSceneContextOptions` cobre tanto o SceneDirectory quanto o SceneNavigation. Em **v13.351** o hook só dispara no SceneDirectory; SceneNavigation tem seu próprio hook `getSceneNavigationContext`.

- [ ] **Step 1: Adicionar segundo hook após o `getSceneContextOptions` existente**

Após o bloco existente:

```javascript
Hooks.on("getSceneContextOptions", (app, entryOptions) => {
  entryOptions.push({
    label: "Photo Note from Scene",
    icon: "fa-solid fa-camera-polaroid",
    onClick: async (event, li) => {
      const scene = await _resolveDocumentFromLi(li, game.scenes);
      if (scene) await createPhotoNoteFromScene(scene);
      else ui.notifications.warn("Investigation Board: Could not resolve Scene.");
    }
  });
});
```

Adicionar logo abaixo:

```javascript
// v13: SceneNavigation has a separate hook (not covered by getSceneContextOptions)
Hooks.on("getSceneNavigationContext", (app, entryOptions) => {
  entryOptions.push({
    label: "Photo Note from Scene",
    icon: "fa-solid fa-camera-polaroid",
    onClick: async (event, li) => {
      const scene = await _resolveDocumentFromLi(li, game.scenes);
      if (scene) await createPhotoNoteFromScene(scene);
      else ui.notifications.warn("Investigation Board: Could not resolve Scene.");
    }
  });
});
```

---

### Task 4.3: Validar nomes dos hooks de entry context em v13

**Files:**
- Modify: `scripts/main.js:669,693,719,787,801` (apenas se nomes mudaram)

**Contexto:** Hooks como `getActorContextOptions`, `getItemContextOptions`, `getJournalEntryPageContextOptions`, `getPlaylistContextOptions`, `getPlaylistSoundContextOptions` existem em v13.351. O nome `getActorContextOptions` é v13+. **Validar** abrindo cada directory e tentando o context menu.

- [ ] **Step 1: 🧪 TESTAR cada context menu**

1. F5
2. Botão direito em Actor na sidebar → "Photo Note from Actor" / "Unknown Photo Note from Actor"
3. Botão direito em Item → "Photo Note from Item"
4. Botão direito em Scene na sidebar → "Photo Note from Scene"
5. Botão direito em Scene Navigation (topo) → "Photo Note from Scene"
6. Botão direito em Journal page (image) → "Create Handout Note"
7. Botão direito em Journal page (text) → "Text to Index Card" + "Text to Document Note"
8. Botão direito em Playlist → "Import Playlist as Notes" (GM apenas)
9. Botão direito em Playlist sound → "Create Media Note"
10. Botão direito em folder (Actor/Item/Journal/Scene/Playlist) → "Import Folder as Notes"

- [ ] **Step 2: Para qualquer menu que não aparecer, anotar o nome real do hook**

No console do v13:

```javascript
// Verificar quais hooks estão disponíveis em v13:
Hooks._hooks; // lista todos
// Ou inspecionar abrindo o menu enquanto monitora com Hooks.on em try mode.
```

Anotar e substituir o nome do hook em `scripts/main.js`.

- [ ] **Step 3: Commit**

```bash
git add scripts/main.js
git commit -m "feat(v13): split folder context hooks per directory type + add scene nav hook"
```

---

## Fase 5 — Image popout e document sheet header

### Task 5.1: Substituir `getHeaderControlsImagePopout` por `renderImagePopout`

**Files:**
- Modify: `scripts/main.js:910-930` (aproximadamente)

**Contexto:** `getHeaderControlsImagePopout` foi adicionado em v14 para popular o ellipsis-menu da nova `ImagePopout` AppV2. Em **v13.351**, o `ImagePopout` ainda pode ser AppV1 (ou AppV2 sem esse hook). A abordagem v13 é injetar via `renderImagePopout` no DOM da janela, adicionando um botão ao `.window-header` ou `.controls-dropdown`.

- [ ] **Step 1: Localizar bloco atual e ler integralmente**

```bash
grep -n "getHeaderControlsImagePopout" scripts/main.js
```

- [ ] **Step 2: Substituir o hook**

Trocar (aproximadamente linhas 910–930):

```javascript
// Adds "Create Handout Note" to the Image Popout header controls dropdown (v14 AppV2 approach).
// getHeaderControlsImagePopout fires when Foundry builds the ellipsis-menu controls list.
Hooks.on("getHeaderControlsImagePopout", (app, controls) => {
  if (!game.user.isGM) return;
  controls.push({
    action: "createHandoutNote",
    icon: "fa-solid fa-file-image",
    label: "Create Handout Note",
    onClick: () => {
      const src = app.options.src;
      if (src) {
        createHandoutNoteFromImage(src);
      } else {
        ui.notifications.warn("Investigation Board: Could not resolve image source from popout.");
      }
    }
  });
  // ... (preserve qualquer item adicional do bloco original)
});
```

Por:

```javascript
// v13: ImagePopout has no getHeaderControlsImagePopout hook. Inject a header button
// via renderImagePopout on the rendered DOM.
Hooks.on("renderImagePopout", (app, html, data) => {
  if (!game.user.isGM) return;
  const root = html instanceof jQuery ? html[0] : html;
  if (!root) return;

  // Avoid duplicate injection on re-renders
  if (root.querySelector(".ib-create-handout-btn")) return;

  const header = root.querySelector(".window-header") ?? root.querySelector("header");
  if (!header) return;

  const btn = document.createElement("a");
  btn.className = "header-button ib-create-handout-btn";
  btn.title = "Create Handout Note";
  btn.innerHTML = `<i class="fa-solid fa-file-image"></i>`;
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const src = app.options?.src ?? data?.image ?? data?.src;
    if (src) createHandoutNoteFromImage(src);
    else ui.notifications.warn("Investigation Board: Could not resolve image source from popout.");
  });

  // Insert before the close button if possible
  const closeBtn = header.querySelector(".header-button.close, [data-action='close']");
  if (closeBtn) closeBtn.before(btn);
  else header.appendChild(btn);
});
```

- [ ] **Step 3: 🧪 TESTAR**

1. F5
2. Abrir um actor com uma imagem; clicar na imagem do retrato para abrir popout
3. Verificar: botão de imagem "Create Handout Note" aparece no header
4. Clicar nele → handout deve ser criado no canvas
5. Repetir com um Journal Image Page e com um Item portrait

- [ ] **Step 4: Commit**

```bash
git add scripts/main.js
git commit -m "feat(v13): inject Image Popout header button via renderImagePopout"
```

---

## Fase 6 — Refinamentos de API e Color

### Task 6.1: Confirmar `foundry.utils.Color.multiplyScalar` em v13

**Files:**
- Modify: `scripts/canvas/connection-manager.js:219` (apenas se necessário)

**Contexto:** O método estático `foundry.utils.Color.multiplyScalar(raw, factor)` existe em v13.351. O CLAUDE.md notou que em **v14** `Color extends Number`; em **v13** `Color` também já estende `Number` (foi introduzido em v12). O código atual `toYarnColorNum` usa `Number(colorInput)` que funciona em ambos.

- [ ] **Step 1: 🧪 TESTAR linhas de conexão**

1. F5
2. Criar duas notas
3. Clicar no pin da primeira e conectar à segunda (botão direito sobre alvo)
4. Verificar: linha aparece com cor do usuário, escurecida em ~15%
5. Tentar com usuário diferente (cor diferente) — confirmar persistência da cor após reload

- [ ] **Step 2: Se quebrar, simplificar `toYarnColorNum`**

Caso `multiplyScalar` não exista, substituir linhas 217–219:

```javascript
  const isLight = ((raw >> 16 & 0xFF) > 178) && ((raw >> 8 & 0xFF) > 178) && ((raw & 0xFF) > 178);
  return foundry.utils.Color.multiplyScalar(raw, isLight ? 0.75 : 0.85);
```

Por implementação manual:

```javascript
  const isLight = ((raw >> 16 & 0xFF) > 178) && ((raw >> 8 & 0xFF) > 178) && ((raw & 0xFF) > 178);
  const factor = isLight ? 0.75 : 0.85;
  const r = Math.floor(((raw >> 16) & 0xFF) * factor);
  const g = Math.floor(((raw >> 8) & 0xFF) * factor);
  const b = Math.floor((raw & 0xFF) * factor);
  return (r << 16) | (g << 8) | b;
```

- [ ] **Step 3: Commit se houve mudança**

```bash
git add scripts/canvas/connection-manager.js
git commit -m "fix(v13): manual color darkening fallback if Color.multiplyScalar missing"
```

---

### Task 6.2: Verificar `foundry.applications.instances.get`

**Files:** N/A (apenas verificação)

**Contexto:** Usado em `socket-handler.js:215,232,242`, `main.js:576,579`, `drawing-sheet.js:325`, `custom-drawing.js:408,487`. Existe em v13.351.

- [ ] **Step 1: Verificar disponibilidade no console v13**

```javascript
foundry.applications.instances; // deve ser Map
```

Expected: `Map(0)` ou similar — existe.

> Se for `undefined`, substituir todas as ocorrências por `ui.windows[Number(appId)]` ou similar. Não esperado em v13.351.

---

### Task 6.3: Verificar `foundry.applications.ux.TextEditor.implementation`

**Files:** N/A (apenas verificação)

- [ ] **Step 1: Verificar no console v13**

```javascript
foundry.applications.ux?.TextEditor?.implementation; // deve ser uma classe
```

> Se undefined em v13.351, usar `TextEditor` (global) como fallback nos arquivos: `drawing-sheet.js:27` e `note-previewer.js:8`.

- [ ] **Step 2: Ajustar com fallback defensivo**

Substituir em ambos:

```javascript
const TextEditor = foundry.applications.ux.TextEditor.implementation;
```

Por:

```javascript
const TextEditor = foundry.applications.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
```

---

### Task 6.4: 🧪 TESTAR FASE 6 e commit

- [ ] **Step 1: Recarregar e testar fluxo completo**

1. F5
2. Console F12 → verificar sem erros
3. Criar uma nota de cada tipo
4. Criar conexões
5. Abrir Note Previewer (duplo clique)
6. Abrir VideoPlayer (duplo clique numa media video note)

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "fix(v13): defensive namespace fallbacks for TextEditor/Color/instances"
```

---

## Fase 7 — Auditoria de features

Esta fase percorre **toda** funcionalidade descrita no CLAUDE.md e valida no v13. Sem código novo — apenas verificação e fix pontual se algo não funcionar.

### Task 7.1: Checklist completo de features

- [ ] **Step 1: Notas e tipos**

| Feature | Como testar | Esperado |
|---------|-------------|----------|
| Sticky Note | Toolbar → criar; editar texto/cor/font | Renderiza amarela; salva mudanças |
| Photo Note | Toolbar → criar; trocar imagem; toggle Unknown | Polaroid com imagem; "???" quando unknown |
| Index Card | Toolbar → criar; editar texto | 600×400, font tamanho 9 |
| Handout Note | Toolbar → criar; trocar imagem | Imagem-only; resize com handles |
| Media Audio | Toolbar → criar; abrir edit; setar mp3; clicar pin | Cassete sprite; áudio toca via socket |
| Media Video | Edit → tab Video; setar mp4; duplo clique | VideoPlayer abre; "Open for All" sincroniza |
| Pin-only | Toolbar → criar; botão direito | Convert-to menu aparece |
| Document Note | Journal text page → "Text to Document Note" | Parchment + texto formatado |

- [ ] **Step 2: Connections**

| Feature | Como testar | Esperado |
|---------|-------------|----------|
| Criar conexão | Clicar pin → botão direito em outra nota | Linha aparece com cor do user |
| Cor escurecida | Comparar cor user vs linha | Linha ~15% mais escura |
| Apagar conexão | Editar nota → tab Connections → remover | Linha some |
| Pins on top | Sobrepor pin sobre linha | Pin renderiza acima |
| Hidden GM-only | Botão direito → Hide | Player não vê; GM vê com alpha 0.4 |

- [ ] **Step 3: Collaboration / Socket**

| Feature | Como testar | Esperado |
|---------|-------------|----------|
| Player edita nota | Logar como Player + GM; player edita | Routing via socket — GM persiste |
| Player cria nota | Player usa toolbar | Nota criada via socket |
| Audio broadcast | GM clica pin de audio | Toca em todos os clients |
| Video broadcast | GM "Open for All" | VideoPlayer abre em todos |

- [ ] **Step 4: Drag & drop**

| Feature | Como testar | Esperado |
|---------|-------------|----------|
| Drop image desktop → canvas | Arrastar PNG do explorador | Handout note criada |
| Paste image clipboard | Ctrl+V com imagem | Handout note criada |
| Drop image URL | Arrastar imagem do Chrome | Handout note criada |
| Drop document → nota | Arrastar Actor sobre nota | linkedObject setado |

- [ ] **Step 5: Settings**

| Feature | Como testar | Esperado |
|---------|-------------|----------|
| Appearance dialog | Settings → Configure Appearance | Diálogo abre, salva |
| Note Defaults | Settings → Configure Note Defaults (GM) | Diálogo abre, salva |
| `pinImagesFolder` | Trocar para custom folder | Pins atualizam imediatamente |
| `pinColor: none` | Setting → None | Sem pins, sem connections |
| `showSelectionControls` | Toggle | Bounding-box aparece/some |
| `allowScaling` | Toggle | Scale handles aparecem/somem |

- [ ] **Step 6: Para CADA falha, criar uma sub-task ad-hoc**

Template:

```markdown
### Task 7.1.X (ad-hoc): Fix [feature]

**Files:** [arquivo]:[linha]

**Sintoma:** [descrever]

**Causa provável:** [API mudou de v14 → v13]

**Fix:** [substituição]

- [ ] Edit
- [ ] Test
- [ ] Commit
```

---

### Task 7.2: Limpeza de comentários referenciando v14

**Files:** `scripts/**/*.js` e `CLAUDE.md`

- [ ] **Step 1: Buscar comentários v14**

```bash
grep -rn "v14\|version 14\|Foundry v14\|in v14" scripts CLAUDE.md
```

- [ ] **Step 2: Substituir referências**

Atualizar comentários e CLAUDE.md trocando "v14" por "v13" onde fizer sentido. Não trocar mecânicamente — ler cada contexto. Especialmente em CLAUDE.md, a seção "v14 Migration Notes" pode ser renomeada para "v13 Compatibility Notes" e ter o conteúdo atualizado.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs(v13): update comments and CLAUDE.md to reflect v13 target"
```

---

## Fase 8 — Verificação final

### Task 8.1: Smoke test integrado

- [ ] **Step 1: Cenário completo**

1. Foundry v13.351, mundo limpo
2. Habilitar Investigation Board
3. Abrir cena
4. Criar uma nota de cada tipo (8 notas no total)
5. Conectar várias entre si
6. Esconder uma (GM hide)
7. Logar como Player → verificar visibilidade correta
8. Player edita uma sticky → verificar socket
9. GM broadcast vídeo → verificar sincronização
10. Refresh F5 → verificar persistência

- [ ] **Step 2: Verificar console limpo**

Console F12 → nenhum erro/warning durante todo o teste.

- [ ] **Step 3: Verificar `module.json` final**

```bash
cat module.json | grep -A4 compatibility
```

Expected: `minimum: "13"`, `verified: "13"`, `maximum: "13"`.

- [ ] **Step 4: Commit final e tag**

```bash
git add -A
git commit -m "chore(v13): final smoke test pass"
git tag v6.0.0-v13
```

---

## Self-Review (executado durante o planejamento)

**Spec coverage:**
- ✅ module.json compatibility (Fase 0)
- ✅ this.shape → this (Fase 1)
- ✅ getSceneControlButtons array vs object (Fase 1)
- ✅ _refreshState → _refreshFrame + frame.handleContainer (Fase 2)
- ✅ _prepareSubmitData mantido (Fase 1, comentário ajustado)
- ✅ getFolderContextOptions consolidado → split por tipo (Fase 4)
- ✅ getSceneNavigationContext readded (Fase 4)
- ✅ getHeaderControlsImagePopout → renderImagePopout (Fase 5)
- ✅ Color/multiplyScalar fallback (Fase 6)
- ✅ Namespace fallbacks (Fase 6)
- ✅ Document Notes, Video Player portados (não precisam mudança — ApplicationV2/HTMLText/PIXI já existem em v13)
- ✅ Validação manual completa (Fase 7)

**Placeholder scan:** Sem placeholders genéricos. Há um "TBD" implícito em Task 4.3 (validar nomes de hook em v13.351) — é uma validação que **requer** o Foundry rodando, não há como hardcode antes. Está marcado como step explícito de validação.

**Type consistency:**
- `_applyHandleVisibility()` — referenciado em `_refreshFrame` (renomeado de `_refreshState`) e em `draw()` (monkey-patch removido). Nome consistente.
- `this.frame.handleContainer.children` — usado em `_applyHandleVisibility` (Task 2.1). Não vaza para outros arquivos.
- `pushTool` helper — local de `getSceneControlButtons` em Task 1.2. Não vaza.

---

## Execution Handoff

Plano salvo em `docs/superpowers/plans/2026-05-11-foundry-v14-to-v13-downgrade.md`.

**Sugestão de execução:** **Inline com checkpoints manuais** (Fases 0→8) em vez de subagent-driven, porque:

1. Cada fase tem um checkpoint `🧪 TESTAR` que **requer** o Foundry v13.351 aberto no seu computador (subagent não consegue rodar).
2. Trabalho é predominantemente mecânico (substituições documentadas) — pouco a se ganhar com paralelização.
3. Você prefere "mínimo funcional → testar aos pouco" (resposta inicial) — encaixa exatamente em commit-after-each-phase.

**Recomendação:** começar pela **Fase 0 + Fase 1**, testar no Foundry, e só então prosseguir. Posso executar fase por fase quando você der o go.

Quer que eu execute a Fase 0 (compatibility) e Fase 1 (mínimo funcional) agora?
