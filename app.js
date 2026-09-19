const GEMINI_MODEL = "gemini-3.1-flash-lite";

const STORAGE_KEY = "hi_ueo_agents";
const WORKFLOW_STORAGE_KEY = "hi_ueo_workflows";

const WEB_SEARCH_URL =
    "https://hi-ueo-search.ilyadisapeken.workers.dev";

const TOOL_INFO = {
    calculator: {
        name: "Calculator",
        icon: "🧮"
    },
    text_processor: {
        name: "Text Processor",
        icon: "📝"
    },
    web_search: {
        name: "Web Search",
        icon: "🌐"
    }
};

let selectedTools = new Set();

let workflowSteps = [];
let workflowStepCounter = 0;


/* =========================
   ELEMENTS
========================= */

const apiKeyInput =
    document.getElementById("apiKey");

const agentNameInput =
    document.getElementById("agentName");

const agentInstructionInput =
    document.getElementById("agentInstruction");

const agentTaskInput =
    document.getElementById("agentTask");

const runButton =
    document.getElementById("runButton");

const saveButton =
    document.getElementById("saveButton");

const statusText =
    document.getElementById("statusText");

const resultBox =
    document.getElementById("result");

const toolStatus =
    document.getElementById("toolStatus");

const workflowStepsBox =
    document.getElementById("workflowSteps");

const workflowOutput =
    document.getElementById("workflowOutput");

const agentsList =
    document.getElementById("agentsList");


/* =========================
   TOOL MANAGER
========================= */

function toggleTool(element) {

    const tool = element.dataset.tool;

    if (selectedTools.has(tool)) {
        selectedTools.delete(tool);
        element.classList.remove("active");
    } else {
        selectedTools.add(tool);
        element.classList.add("active");
    }

    updateToolStatus();
}


function updateToolStatus() {

    if (selectedTools.size === 0) {

        toolStatus.textContent =
            "Tidak ada tool dipilih.";

        return;
    }

    const names =
        [...selectedTools]
        .map(tool => TOOL_INFO[tool].icon + " " + TOOL_INFO[tool].name)
        .join(" • ");

    toolStatus.textContent =
        "Tool aktif: " + names;
}


/* =========================
   GEMINI
========================= */

async function callGemini(
    apiKey,
    instruction,
    task
) {

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const body = {
        system_instruction: {
            parts: [
                {
                    text:
                        instruction ||
                        "Kamu adalah AI assistant yang membantu pengguna."
                }
            ]
        },

        contents: [
            {
                role: "user",
                parts: [
                    {
                        text: task
                    }
                ]
            }
        ]
    };

    const response =
        await fetch(url, {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },

            body: JSON.stringify(body)
        });

    const data =
        await response.json();

    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            "Gemini API error"
        );
    }

    const text =
        data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") || "";

    if (!text) {
        throw new Error(
            "Gemini tidak mengembalikan hasil."
        );
    }

    return text;
}


/* =========================
   CALCULATOR
========================= */

function calculateExpression(input) {

    let expression =
        String(input)
        .replace(/,/g, "")
        .replace(/rp/gi, "")
        .replace(/\s+/g, " ")
        .trim();

    /*
       Hanya izinkan angka dan operator matematika.
    */

    if (!/^[0-9+\-*/().%\s]+$/.test(expression)) {

        return null;
    }

    try {

        const result =
            Function(
                `"use strict"; return (${expression})`
            )();

        if (
            typeof result !== "number" ||
            !Number.isFinite(result)
        ) {
            return null;
        }

        return result;

    } catch {

        return null;
    }
}


function runCalculator(input) {

    const direct =
        calculateExpression(input);

    if (direct !== null) {

        return `${input} = ${formatNumber(direct)}`;
    }

    /*
       Coba cari beberapa ekspresi matematika
       di dalam teks.
    */

    const matches =
        String(input).match(
            /[\d\s.,()+\-*/%]+/g
        ) || [];

    const results = [];

    for (const part of matches) {

        const cleaned =
            part.trim();

        if (!cleaned) continue;

        const value =
            calculateExpression(cleaned);

        if (value !== null) {

            results.push(
                `${cleaned} = ${formatNumber(value)}`
            );
        }
    }

    if (results.length) {
        return results.join("\n");
    }

    return (
        "Calculator tidak menemukan ekspresi matematika yang valid."
    );
}


function formatNumber(number) {

    return new Intl.NumberFormat("id-ID", {
        maximumFractionDigits: 10
    }).format(number);
}


/* =========================
   TEXT PROCESSOR
========================= */

function processText(input, instruction) {

    const text =
        String(input || "").trim();

    if (!text) {
        return "Tidak ada teks untuk diproses.";
    }

    const command =
        String(instruction || "").toLowerCase();

    if (
        command.includes("hitung kata") ||
        command.includes("jumlah kata")
    ) {

        const words =
            text.split(/\s+/).filter(Boolean);

        return (
            `Jumlah kata: ${words.length}\n\n` +
            text
        );
    }

    if (
        command.includes("hitung karakter") ||
        command.includes("jumlah karakter")
    ) {

        return (
            `Jumlah karakter: ${text.length}\n\n` +
            text
        );
    }

    if (
        command.includes("uppercase") ||
        command.includes("huruf besar")
    ) {

        return text.toUpperCase();
    }

    if (
        command.includes("lowercase") ||
        command.includes("huruf kecil")
    ) {

        return text.toLowerCase();
    }

    if (
        command.includes("bersihkan") ||
        command.includes("rapikan")
    ) {

        return text
            .replace(/\s+/g, " ")
            .trim();
    }

    return (
        "TEXT PROCESSOR\n\n" +
        text
    );
}


/* =========================
   WEB SEARCH
========================= */

async function runWebSearch(query) {

    const url =
        `${WEB_SEARCH_URL}/?q=${encodeURIComponent(query)}`;

    const response =
        await fetch(url);

    const data =
        await response.json();

    if (!response.ok || !data.success) {

        throw new Error(
            data?.error ||
            "Web Search gagal."
        );
    }

    const results =
        Array.isArray(data.results)
            ? data.results
            : [];

    if (!results.length) {
        return "Tidak ada hasil pencarian.";
    }

    return results
        .map((item, index) => {

            const title =
                item.title ||
                "Tanpa judul";

            const url =
                item.url ||
                "";

            const snippet =
                item.snippet ||
                item.description ||
                "";

            return (
                `${index + 1}. ${title}\n` +
                `${snippet}\n` +
                `${url}`
            );

        })
        .join("\n\n");
}


/* =========================
   TOOL EXECUTOR
========================= */

async function executeTool(
    tool,
    input,
    instruction = ""
) {

    switch (tool) {

        case "calculator":

            return runCalculator(input);

        case "text_processor":

            return processText(
                input,
                instruction
            );

        case "web_search":

            return await runWebSearch(input);

        default:

            return input;
    }
}


/* =========================
   NORMAL AGENT
========================= */

async function runAgent() {

    const apiKey =
        apiKeyInput.value.trim();

    const instruction =
        agentInstructionInput.value.trim();

    const task =
        agentTaskInput.value.trim();

    if (!apiKey) {

        statusText.textContent =
            "❌ Masukkan Gemini API Key.";

        return;
    }

    if (!task) {

        statusText.textContent =
            "❌ Masukkan Task.";

        return;
    }

    runButton.disabled = true;

    statusText.textContent =
        "⏳ Agent sedang bekerja...";

    resultBox.textContent =
        "Memproses...";

    try {

        let inputForAI = task;

        /*
           Jalankan tools yang dipilih.
        */

        if (selectedTools.size > 0) {

            const toolResults = [];

            for (const tool of selectedTools) {

                statusText.textContent =
                    `⏳ Menjalankan ${TOOL_INFO[tool].name}...`;

                const toolResult =
                    await executeTool(
                        tool,
                        task,
                        instruction
                    );

                toolResults.push(
                    `${TOOL_INFO[tool].icon} ${TOOL_INFO[tool].name}\n${toolResult}`
                );
            }

            inputForAI =
                `TASK AWAL:\n${task}\n\n` +
                `HASIL TOOLS:\n\n` +
                toolResults.join("\n\n");
        }

        statusText.textContent =
            "⏳ Gemini sedang menghasilkan jawaban...";

        const answer =
            await callGemini(
                apiKey,
                instruction,
                inputForAI
            );

        resultBox.textContent =
            answer;

        statusText.textContent =
            "✅ Agent selesai.";

    } catch (error) {

        console.error(error);

        resultBox.textContent =
            "❌ " + error.message;

        statusText.textContent =
            "❌ Agent gagal.";

    } finally {

        runButton.disabled = false;
    }
}


/* =========================
   SAVE AGENT
========================= */

function getAgents() {

    try {

        return JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        ) || [];

    } catch {

        return [];
    }
}


function saveAgent() {

    const name =
        agentNameInput.value.trim();

    const instruction =
        agentInstructionInput.value.trim();

    const task =
        agentTaskInput.value.trim();

    if (!name) {

        statusText.textContent =
            "❌ Masukkan nama agent.";

        return;
    }

    const agents =
        getAgents();

    const agent = {

        id:
            Date.now().toString(),

        type:
            "agent",

        name,

        instruction,

        task,

        tools:
            [...selectedTools],

        createdAt:
            new Date().toISOString()
    };

    agents.push(agent);

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(agents)
    );

    statusText.textContent =
        "✅ Agent berhasil disimpan.";

    renderSavedItems();
}


/* =========================
   WORKFLOW BUILDER
========================= */

function addWorkflowStep(data = {}) {

    workflowStepCounter++;

    const step = {

        id:
            data.id ||
            `step_${Date.now()}_${workflowStepCounter}`,

        name:
            data.name ||
            `Step ${workflowStepCounter}`,

        type:
            data.type ||
            "gemini",

        tool:
            data.tool ||
            "none",

        instruction:
            data.instruction ||
            "",

        enabled:
            data.enabled !== false
    };

    workflowSteps.push(step);

    renderWorkflow();
}


function renderWorkflow() {

    workflowStepsBox.innerHTML = "";

    if (!workflowSteps.length) {

        workflowStepsBox.innerHTML = `
            <div class="empty">
                Belum ada step.<br>
                Klik <strong>➕ Add Step</strong> untuk membuat workflow.
            </div>
        `;

        return;
    }

    workflowSteps.forEach(
        (step, index) => {

            const card =
                document.createElement("div");

            card.className =
                "workflow-step";

            card.dataset.id =
                step.id;

            card.innerHTML = `

                <div class="step-header">

                    <div class="step-number">
                        ${index + 1}
                    </div>

                    <div class="step-title">

                        <strong>
                            ${escapeHtml(step.name)}
                        </strong>

                        <span>
                            ${step.type === "gemini"
                                ? "🤖 Gemini Step"
                                : "🧰 Tool Step"}
                        </span>

                    </div>

                    <div class="step-controls">

                        <button
                            class="secondary small-btn"
                            onclick="moveWorkflowStep(${index}, -1)"
                            ${index === 0 ? "disabled" : ""}
                        >
                            ⬆️
                        </button>

                        <button
                            class="secondary small-btn"
                            onclick="moveWorkflowStep(${index}, 1)"
                            ${index === workflowSteps.length - 1 ? "disabled" : ""}
                        >
                            ⬇️
                        </button>

                        <button
                            class="danger small-btn"
                            onclick="removeWorkflowStep('${step.id}')"
                        >
                            🗑
                        </button>

                    </div>

                </div>

                <label>Nama Step</label>

                <input
                    value="${escapeAttribute(step.name)}"
                    oninput="updateWorkflowStep('${step.id}','name',this.value)"
                >

                <label>Step Type</label>

                <select
                    onchange="updateWorkflowStep('${step.id}','type',this.value)"
                >

                    <option
                        value="gemini"
                        ${step.type === "gemini" ? "selected" : ""}
                    >
                        🤖 Gemini
                    </option>

                    <option
                        value="tool"
                        ${step.type === "tool" ? "selected" : ""}
                    >
                        🧰 Tool
                    </option>

                </select>

                <label>Tool</label>

                <select
                    onchange="updateWorkflowStep('${step.id}','tool',this.value)"
                >

                    <option
                        value="none"
                        ${step.tool === "none" ? "selected" : ""}
                    >
                        Tidak ada tool
                    </option>

                    <option
                        value="web_search"
                        ${step.tool === "web_search" ? "selected" : ""}
                    >
                        🌐 Web Search
                    </option>

                    <option
                        value="calculator"
                        ${step.tool === "calculator" ? "selected" : ""}
                    >
                        🧮 Calculator
                    </option>

                    <option
                        value="text_processor"
                        ${step.tool === "text_processor" ? "selected" : ""}
                    >
                        📝 Text Processor
                    </option>

                </select>

                <label>
                    ${step.type === "tool"
                        ? "Instruksi Tool"
                        : "Instruksi Gemini"}
                </label>

                <textarea
                    placeholder="${
                        step.type === "tool"
                            ? "Contoh: hitung angka berikut / cari informasi tentang..."
                            : "Contoh: ubah hasil sebelumnya menjadi artikel..."
                    }"
                    oninput="updateWorkflowStep('${step.id}','instruction',this.value)"
                >${escapeHtml(step.instruction)}</textarea>

            `;

            workflowStepsBox.appendChild(card);

            if (
                index <
                workflowSteps.length - 1
            ) {

                const arrow =
                    document.createElement("div");

                arrow.className =
                    "workflow-arrow";

                arrow.textContent =
                    "↓";

                workflowStepsBox.appendChild(
                    arrow
                );
            }
        }
    );
}


function updateWorkflowStep(
    id,
    property,
    value
) {

    const step =
        workflowSteps.find(
            item => item.id === id
        );

    if (!step) return;

    step[property] = value;

    if (property === "type") {

        renderWorkflow();
    }
}


function moveWorkflowStep(
    index,
    direction
) {

    const newIndex =
        index + direction;

    if (
        newIndex < 0 ||
        newIndex >= workflowSteps.length
    ) {
        return;
    }

    const temp =
        workflowSteps[index];

    workflowSteps[index] =
        workflowSteps[newIndex];

    workflowSteps[newIndex] =
        temp;

    renderWorkflow();
}


function removeWorkflowStep(id) {

    workflowSteps =
        workflowSteps.filter(
            step => step.id !== id
        );

    renderWorkflow();
}


function clearWorkflow() {

    if (!workflowSteps.length) {
        return;
    }

    if (
        !confirm(
            "Hapus semua step workflow?"
        )
    ) {
        return;
    }

    workflowSteps = [];

    workflowStepCounter = 0;

    workflowOutput.innerHTML = "";

    renderWorkflow();
}


/* =========================
   WORKFLOW EXECUTION
========================= */

async function executeWorkflowGemini(
    apiKey,
    step,
    input,
    originalTask,
    toolOutput
) {

    const instruction =
        step.instruction ||
        "Proses input berikut.";

    const prompt = `

TASK AWAL:
${originalTask}

OUTPUT DARI STEP SEBELUMNYA:
${input}

HASIL TOOL:
${toolOutput || "Tidak ada tool."}

INSTRUKSI STEP:
${instruction}

Kerjakan step ini berdasarkan konteks di atas.
Jangan kehilangan informasi penting dari output sebelumnya.

`;

    return await callGemini(
        apiKey,
        instruction,
        prompt
    );
}


async function runWorkflow() {

    const apiKey =
        apiKeyInput.value.trim();

    const originalTask =
        agentTaskInput.value.trim();

    if (!apiKey) {

        workflowOutput.innerHTML = `
            <div class="workflow-result-box">
                ❌ Masukkan Gemini API Key.
            </div>
        `;

        return;
    }

    if (!originalTask) {

        workflowOutput.innerHTML = `
            <div class="workflow-result-box">
                ❌ Masukkan Task.
            </div>
        `;

        return;
    }

    if (!workflowSteps.length) {

        workflowOutput.innerHTML = `
            <div class="workflow-result-box">
                ❌ Workflow belum memiliki step.
            </div>
        `;

        return;
    }

    const button =
        document.getElementById(
            "runWorkflowButton"
        );

    button.disabled = true;

    workflowOutput.innerHTML = `
        <div class="workflow-result-box">
            ⏳ Menjalankan workflow...
        </div>
    `;

    let currentInput =
        originalTask;

    const results = [];

    try {

        for (
            let index = 0;
            index < workflowSteps.length;
            index++
        ) {

            const step =
                workflowSteps[index];

            statusText.textContent =
                `⏳ Workflow: ${step.name}...`;

            let toolOutput = "";

            /*
               Jika step mempunyai tool,
               tool mendapat konteks dari
               output sebelumnya + instruksi step.
            */

            if (
                step.tool &&
                step.tool !== "none"
            ) {

                let toolInput =
                    currentInput;

                if (step.instruction.trim()) {

                    if (
                        step.tool === "web_search"
                    ) {

                        toolInput =
                            step.instruction
                            .trim();

                    } else {

                        toolInput =
                            `${step.instruction.trim()}\n\n${currentInput}`;
                    }
                }

                toolOutput =
                    await executeTool(
                        step.tool,
                        toolInput,
                        step.instruction
                    );
            }

            let output;

            if (step.type === "tool") {

                /*
                   Tool-only step.
                */

                output =
                    toolOutput ||
                    currentInput;

            } else {

                /*
                   Gemini step.
                */

                output =
                    await executeWorkflowGemini(
                        apiKey,
                        step,
                        currentInput,
                        originalTask,
                        toolOutput
                    );
            }

            currentInput =
                output;

            results.push({
                number:
                    index + 1,

                name:
                    step.name,

                output
            });

            renderWorkflowProgress(
                results,
                currentInput
            );
        }

        statusText.textContent =
            "✅ Workflow selesai.";

    } catch (error) {

        console.error(error);

        statusText.textContent =
            "❌ Workflow gagal.";

        workflowOutput.innerHTML += `
            <div class="workflow-result-box">
                ❌ ${escapeHtml(error.message)}
            </div>
        `;

    } finally {

        button.disabled = false;
    }
}


function renderWorkflowProgress(
    results,
    finalOutput
) {

    let html = "";

    html += `
        <div class="workflow-result-box">

            <strong>🔗 Workflow Result</strong>

            <div style="margin-top:15px;">
    `;

    for (const item of results) {

        html += `
            <div class="step-result">

                <div class="step-result-title">
                    Step ${item.number} — ${escapeHtml(item.name)}
                </div>

                <div>
                    ${escapeHtml(item.output)}
                </div>

            </div>
        `;
    }

    html += `
            </div>

            <div
                style="
                    margin-top:20px;
                    padding-top:15px;
                    border-top:1px solid #203a56;
                "
            >

                <strong>
                    🎯 Final Output
                </strong>

                <div style="margin-top:8px;">
                    ${escapeHtml(finalOutput)}
                </div>

            </div>

        </div>
    `;

    workflowOutput.innerHTML =
        html;
}


/* =========================
   SAVE WORKFLOW
========================= */

function getWorkflows() {

    try {

        return JSON.parse(
            localStorage.getItem(
                WORKFLOW_STORAGE_KEY
            )
        ) || [];

    } catch {

        return [];
    }
}


function saveWorkflow() {

    if (!workflowSteps.length) {

        statusText.textContent =
            "❌ Tambahkan step terlebih dahulu.";

        return;
    }

    const name =
        agentNameInput.value.trim() ||
        "HI-UEO Workflow";

    const task =
        agentTaskInput.value.trim();

    const workflows =
        getWorkflows();

    const workflow = {

        id:
            Date.now().toString(),

        type:
            "workflow",

        name:
            `${name} Workflow`,

        task,

        steps:
            JSON.parse(
                JSON.stringify(workflowSteps)
            ),

        createdAt:
            new Date().toISOString()
    };

    workflows.push(workflow);

    localStorage.setItem(
        WORKFLOW_STORAGE_KEY,
        JSON.stringify(workflows)
    );

    statusText.textContent =
        "✅ Workflow berhasil disimpan.";

    renderSavedItems();
}


/* =========================
   LOAD SAVED ITEMS
========================= */

function renderSavedItems() {

    const agents =
        getAgents();

    const workflows =
        getWorkflows();

    const all = [
        ...agents,
        ...workflows
    ].sort(
        (a,b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
    );

    if (!all.length) {

        agentsList.innerHTML = `
            <div class="empty">
                Belum ada Agent atau Workflow tersimpan.
            </div>
        `;

        return;
    }

    agentsList.innerHTML = "";

    all.forEach(item => {

        const element =
            document.createElement("div");

        element.className =
            "agent-item";

        const isWorkflow =
            item.type === "workflow";

        element.innerHTML = `

            <div class="agent-item-header">

                <strong>
                    ${isWorkflow ? "🔗" : "🤖"}
                    ${escapeHtml(item.name)}
                </strong>

                <span class="agent-type">
                    ${isWorkflow
                        ? "WORKFLOW"
                        : "AGENT"}
                </span>

            </div>

            <p>
                ${isWorkflow
                    ? `${item.steps?.length || 0} step`
                    : `${item.tools?.length || 0} tool`}
            </p>

            <div class="agent-buttons">

                <button
                    class="secondary small-btn"
                    onclick="${
                        isWorkflow
                            ? `loadWorkflow('${item.id}')`
                            : `loadAgent('${item.id}')`
                    }"
                >
                    📂 Load
                </button>

                <button
                    class="danger small-btn"
                    onclick="${
                        isWorkflow
                            ? `deleteWorkflow('${item.id}')`
                            : `deleteAgent('${item.id}')`
                    }"
                >
                    🗑 Delete
                </button>

            </div>

        `;

        agentsList.appendChild(
            element
        );
    });
}


/* =========================
   LOAD AGENT
========================= */

function loadAgent(id) {

    const agent =
        getAgents().find(
            item => item.id === id
        );

    if (!agent) return;

    agentNameInput.value =
        agent.name || "";

    agentInstructionInput.value =
        agent.instruction || "";

    agentTaskInput.value =
        agent.task || "";

    selectedTools =
        new Set(agent.tools || []);

    document
        .querySelectorAll(".tool-card")
        .forEach(card => {

            if (
                selectedTools.has(
                    card.dataset.tool
                )
            ) {

                card.classList.add("active");

            } else {

                card.classList.remove("active");
            }
        });

    updateToolStatus();

    statusText.textContent =
        "📂 Agent dimuat.";

    window.scrollTo({
        top:0,
        behavior:"smooth"
    });
}


/* =========================
   LOAD WORKFLOW
========================= */

function loadWorkflow(id) {

    const workflow =
        getWorkflows().find(
            item => item.id === id
        );

    if (!workflow) return;

    agentNameInput.value =
        String(workflow.name || "")
        .replace(/\s+Workflow$/, "");

    agentTaskInput.value =
        workflow.task || "";

    workflowSteps =
        JSON.parse(
            JSON.stringify(
                workflow.steps || []
            )
        );

    workflowStepCounter =
        workflowSteps.length;

    renderWorkflow();

    statusText.textContent =
        "📂 Workflow dimuat.";

    document
        .querySelector(".section")
        ?.scrollIntoView({
            behavior:"smooth"
        });
}


/* =========================
   DELETE AGENT
========================= */

function deleteAgent(id) {

    if (
        !confirm(
            "Hapus agent ini?"
        )
    ) {
        return;
    }

    const agents =
        getAgents().filter(
            item => item.id !== id
        );

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(agents)
    );

    renderSavedItems();
}


/* =========================
   DELETE WORKFLOW
========================= */

function deleteWorkflow(id) {

    if (
        !confirm(
            "Hapus workflow ini?"
        )
    ) {
        return;
    }

    const workflows =
        getWorkflows().filter(
            item => item.id !== id
        );

    localStorage.setItem(
        WORKFLOW_STORAGE_KEY,
        JSON.stringify(workflows)
    );

    renderSavedItems();
}


/* =========================
   SECURITY / HTML HELPERS
========================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {

    return escapeHtml(value);
}


/* =========================
   EVENTS
========================= */

runButton.addEventListener(
    "click",
    runAgent
);

saveButton.addEventListener(
    "click",
    saveAgent
);


/* =========================
   INITIALIZE
========================= */

renderWorkflow();

renderSavedItems();

updateToolStatus();
