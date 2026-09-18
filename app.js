const GEMINI_MODEL = "gemini-3.1-flash-lite";
const STORAGE_KEY = "hi_ueo_agents";

const TOOL_INFO = {
    calculator: {
        name: "Calculator",
        icon: "🧮",
        description: "Menghitung operasi matematika."
    },
    text_processor: {
        name: "Text Processor",
        icon: "📝",
        description: "Mengolah, meringkas, memperbaiki, dan menyusun teks."
    },
    web_search: {
        name: "Web Search",
        icon: "🌐",
        description: "Kemampuan untuk pencarian informasi web."
    }
};


/* =========================
   BASIC AGENT FUNCTIONS
========================= */

function getAgentName() {
    const input = document.getElementById("agentName");
    return input ? input.value.trim() : "HI-UEO Agent";
}


/* =========================
   TOOL SELECTION
========================= */

function toggleTool(card) {
    if (!card) return;

    card.classList.toggle("active");
    updateToolUI();
}


function getSelectedTools() {
    return Array.from(
        document.querySelectorAll(".tool-card.active")
    ).map(card => card.dataset.tool);
}


function updateToolUI() {
    const selectedTools = getSelectedTools();
    const status = document.getElementById("toolStatus");

    if (!status) return;

    if (selectedTools.length === 0) {
        status.innerText = "🔧 Belum ada tool dipilih.";
        return;
    }

    const names = selectedTools.map(
        tool => TOOL_INFO[tool]?.name || tool
    );

    status.innerText =
        `🔧 ${selectedTools.length} tool aktif: ${names.join(", ")}`;
}


function setSelectedTools(tools) {
    const selected = Array.isArray(tools) ? tools : [];

    document.querySelectorAll(".tool-card").forEach(card => {
        const tool = card.dataset.tool;

        card.classList.toggle(
            "active",
            selected.includes(tool)
        );
    });

    updateToolUI();
}


/* =========================
   REAL CALCULATOR
========================= */

function calculateExpression(expression) {
    if (!expression) {
        throw new Error("Ekspresi matematika kosong.");
    }

    let clean = String(expression)
        .replace(/,/g, "")
        .replace(/\s+/g, "");

    if (!/^[0-9+\-*/().%]+$/.test(clean)) {
        throw new Error(
            "Ekspresi mengandung karakter yang tidak didukung."
        );
    }

    if (
        clean.includes("**") ||
        clean.includes("//")
    ) {
        throw new Error(
            "Operator matematika tidak valid."
        );
    }

    try {
        const result =
            Function(
                `"use strict"; return (${clean})`
            )();

        if (
            typeof result !== "number" ||
            !Number.isFinite(result)
        ) {
            throw new Error(
                "Hasil perhitungan tidak valid."
            );
        }

        return result;

    } catch (error) {
        throw new Error(
            "Ekspresi matematika tidak valid."
        );
    }
}


function findCalculationExpressions(text) {
    const expressions = [];

    const matches = text.match(
        /(?:\(?\d+(?:[.,]\d+)?\)?\s*(?:[+\-*/%]\s*\(?\d+(?:[.,]\d+)?\)?)+)/g
    );

    if (!matches) {
        return expressions;
    }

    matches.forEach(expression => {

        const normalized =
            expression.replace(/,/g, "");

        if (!expressions.includes(normalized)) {
            expressions.push(normalized);
        }

    });

    return expressions;
}


function runCalculator(task) {

    const expressions =
        findCalculationExpressions(task);

    if (expressions.length === 0) {
        return {
            used: false,
            results: []
        };
    }

    const results = [];

    for (const expression of expressions) {

        try {

            const value =
                calculateExpression(expression);

            results.push({
                expression,
                result: value
            });

        } catch (error) {

            results.push({
                expression,
                error: error.message
            });

        }
    }

    return {
        used: true,
        results
    };
}


function buildCalculatorContext(task) {

    const calculator =
        runCalculator(task);

    if (!calculator.used) {
        return "";
    }

    let context =
        "\n\nHASIL CALCULATOR HI-UEO:\n";

    calculator.results.forEach(item => {

        if (item.error) {

            context +=
                `- ${item.expression} → ERROR: ${item.error}\n`;

        } else {

            context +=
                `- ${item.expression} = ${item.result}\n`;
        }

    });

    context +=
        "\nGunakan hasil Calculator di atas jika relevan dengan tugas pengguna.\n";

    return context;
}


/* =========================
   TEXT PROCESSOR
========================= */

function detectTextProcessorTask(task) {

    const text = String(task).toLowerCase();

    const keywords = [
        "ringkas",
        "rangkum",
        "ringkasan",
        "resume",
        "summarize",
        "summary",
        "perbaiki teks",
        "perbaiki tulisan",
        "perbaiki kalimat",
        "koreksi",
        "rapikan",
        "ubah gaya",
        "parafrase",
        "parafrasekan",
        "buat lebih formal",
        "buat lebih profesional",
        "buat lebih singkat",
        "buat lebih menarik",
        "susun ulang",
        "terjemahkan",
        "translate",
        "buat poin",
        "poin utama"
    ];

    return keywords.some(
        keyword => text.includes(keyword)
    );
}


function buildTextProcessorContext(task) {

    if (!detectTextProcessorTask(task)) {
        return "";
    }

    return `
    
TEXT PROCESSOR HI-UEO AKTIF:

Tugas pengguna berkaitan dengan pengolahan teks.

Kemampuan yang dapat digunakan:
- meringkas teks
- membuat poin-poin utama
- memperbaiki tata bahasa
- memperbaiki struktur kalimat
- membuat tulisan lebih profesional
- membuat tulisan lebih singkat
- membuat parafrase
- menyusun ulang teks
- mengubah gaya penulisan
- menerjemahkan teks jika diminta

ATURAN TEXT PROCESSOR:
1. Pertahankan makna asli teks.
2. Jangan menambahkan fakta yang tidak diminta.
3. Jika diminta meringkas, fokus pada informasi paling penting.
4. Jika diminta memperbaiki tulisan, pertahankan maksud penulis.
5. Jika diminta membuat gaya tertentu, ikuti gaya tersebut.
6. Berikan hasil akhir secara langsung.
`;
}


/* =========================
   TOOL INSTRUCTIONS
========================= */

function buildToolInstructions(tools) {

    if (!tools || tools.length === 0) {

        return `
TOOLS AGENT:
Tidak ada tool tambahan yang dipilih.
`;
    }

    const descriptions =
        tools.map(tool => {

            if (tool === "calculator") {

                return `
- Calculator: HI-UEO dapat melakukan perhitungan matematika secara langsung sebelum meminta Gemini menyusun jawaban.
`;
            }

            if (tool === "text_processor") {

                return `
- Text Processor: HI-UEO dapat membantu meringkas, memperbaiki, menyusun ulang, memparafrase, menerjemahkan, dan mengubah gaya teks.
`;
            }

            if (tool === "web_search") {

                return `
- Web Search: disiapkan untuk pencarian informasi web. Pada versi ini koneksi ke mesin pencari eksternal belum tersedia. Jangan mengklaim telah browsing internet.
`;
            }

            return "";

        }).join("");

    return `
TOOLS AGENT:
${descriptions}
`;
}


/* =========================
   GEMINI
========================= */

async function runGemini(
    apiKey,
    instruction,
    task
) {

    const selectedTools =
        getSelectedTools();

    const toolInstructions =
        buildToolInstructions(
            selectedTools
        );

    const calculatorContext =
        selectedTools.includes("calculator")
            ? buildCalculatorContext(task)
            : "";

    const textProcessorContext =
        selectedTools.includes("text_processor")
            ? buildTextProcessorContext(task)
            : "";

    const prompt = `

Kamu adalah AI Agent bernama "${getAgentName()}".

INSTRUKSI AGENT:
${instruction}

TUGAS PENGGUNA:
${task}

${toolInstructions}

${calculatorContext}

${textProcessorContext}

ATURAN:
1. Pahami instruksi agent.
2. Kerjakan tugas pengguna secara langsung.
3. Jangan menjelaskan proses internalmu.
4. Berikan hasil yang jelas dan terstruktur.
5. Gunakan bahasa Indonesia kecuali pengguna meminta bahasa lain.
6. Gunakan tool yang tersedia jika relevan.
7. Jika terdapat HASIL CALCULATOR HI-UEO, gunakan hasil tersebut dan jangan mengubah angka hasil perhitungan.
8. Jika Text Processor aktif dan tugas berkaitan dengan pengolahan teks, lakukan pengolahan teks sesuai permintaan pengguna.
9. Jangan mengklaim menggunakan tool eksternal yang sebenarnya tidak tersedia.

`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },

            body: JSON.stringify({

                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],

                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000
                }

            })
        }
    );


    const data =
        await response.json();


    if (!response.ok) {

        const message =
            data?.error?.message ||
            "Gemini API mengalami kesalahan.";

        throw new Error(message);
    }


    const text =
        data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();


    if (!text) {

        throw new Error(
            "Gemini tidak menghasilkan jawaban."
        );
    }


    return text;
}


/* =========================
   RUN AGENT
========================= */

async function runAgent() {

    const apiKey =
        document
            .getElementById("apiKey")
            .value
            .trim();

    const name =
        document
            .getElementById("agentName")
            .value
            .trim();

    const instruction =
        document
            .getElementById("agentInstruction")
            .value
            .trim();

    const task =
        document
            .getElementById("agentTask")
            .value
            .trim();

    const result =
        document.getElementById("result");

    const statusText =
        document.getElementById("statusText");

    const button =
        document.getElementById("runButton");


    if (!apiKey) {

        result.innerText =
            "❌ Gemini API Key belum diisi.";

        statusText.innerText =
            "API Key diperlukan";

        return;
    }


    if (!name) {

        result.innerText =
            "❌ Nama Agent belum diisi.";

        statusText.innerText =
            "Nama agent diperlukan";

        return;
    }


    if (!instruction) {

        result.innerText =
            "❌ Instruksi Agent belum diisi.";

        statusText.innerText =
            "Instruksi diperlukan";

        return;
    }


    if (!task) {

        result.innerText =
            "❌ Tugas belum diisi.";

        statusText.innerText =
            "Tugas diperlukan";

        return;
    }


    button.disabled = true;

    button.innerText =
        "⏳ AGENT SEDANG BEKERJA...";

    statusText.innerText =
        "Agent sedang bekerja...";


    const selectedTools =
        getSelectedTools();


    let calculatorPreview = "";


    if (
        selectedTools.includes(
            "calculator"
        )
    ) {

        const calc =
            runCalculator(task);


        if (calc.used) {

            calculatorPreview =
                "\n\n🧮 Calculator dijalankan...\n";


            calc.results.forEach(item => {

                if (item.error) {

                    calculatorPreview +=
                        `❌ ${item.expression}: ${item.error}\n`;

                } else {

                    calculatorPreview +=
                        `✓ ${item.expression} = ${item.result}\n`;
                }

            });
        }
    }


    let textProcessorPreview = "";


    if (
        selectedTools.includes(
            "text_processor"
        ) &&
        detectTextProcessorTask(task)
    ) {

        textProcessorPreview =
            "\n📝 Text Processor aktif...\n";
    }


    result.innerText =
        "🤖 HI-UEO sedang bekerja...\n\n" +

        (
            selectedTools.length > 0
                ? `🔧 Tools aktif: ${
                    selectedTools
                        .map(
                            tool =>
                                TOOL_INFO[tool]?.name ||
                                tool
                        )
                        .join(", ")
                }\n`
                : ""
        ) +

        calculatorPreview +

        textProcessorPreview +

        "\n⏳ Menghubungi Gemini...";


    try {

        const output =
            await runGemini(
                apiKey,
                instruction,
                task
            );


        result.innerText =
            "✅ AGENT SELESAI\n\n" +
            output;


        statusText.innerText =
            "Completed";


    } catch (error) {

        console.error(error);


        result.innerText =
            "❌ AGENT GAGAL\n\n" +
            error.message +
            "\n\nPeriksa API Key dan koneksi internet.";


        statusText.innerText =
            "Error";


    } finally {

        button.disabled = false;

        button.innerText =
            "▶ RUN AGENT";
    }
}


/* =========================
   SAVE AGENT
========================= */

function saveAgent() {

    const name =
        document
            .getElementById("agentName")
            .value
            .trim();

    const instruction =
        document
            .getElementById("agentInstruction")
            .value
            .trim();

    const task =
        document
            .getElementById("agentTask")
            .value
            .trim();

    const selectedTools =
        getSelectedTools();

    const result =
        document.getElementById("result");

    const statusText =
        document.getElementById("statusText");


    if (!name) {

        result.innerText =
            "❌ Isi Nama Agent terlebih dahulu.";

        statusText.innerText =
            "Nama agent diperlukan";

        return;
    }


    if (!instruction) {

        result.innerText =
            "❌ Isi Instruksi Agent terlebih dahulu.";

        statusText.innerText =
            "Instruksi diperlukan";

        return;
    }


    let agents =
        getSavedAgents();


    const newAgent = {

        id: Date.now(),

        name,

        instruction,

        task,

        tools: selectedTools,

        createdAt:
            new Date().toISOString()

    };


    agents.push(newAgent);


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(agents)
    );


    result.innerText =
        "✅ AGENT TERSIMPAN\n\n" +

        `"${name}" berhasil disimpan ke My Agents.\n\n` +

        (
            selectedTools.length > 0
                ? "Tools: " +
                    selectedTools
                        .map(
                            tool =>
                                TOOL_INFO[tool]?.name ||
                                tool
                        )
                        .join(", ")
                : "Tidak menggunakan tool."
        );


    statusText.innerText =
        "Agent Saved";


    renderAgents();
}


/* =========================
   MY AGENTS
========================= */

function getSavedAgents() {

    try {

        const data =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!data) return [];


        const parsed =
            JSON.parse(data);


        return Array.isArray(parsed)
            ? parsed
            : [];


    } catch (error) {

        console.error(
            "Gagal membaca agent:",
            error
        );

        return [];
    }
}


function renderAgents() {

    const agents =
        getSavedAgents();

    const container =
        document.getElementById(
            "agentsList"
        );

    const count =
        document.getElementById(
            "agentCount"
        );


    count.innerText =
        `${agents.length} Agent`;


    if (agents.length === 0) {

        container.innerHTML =
            `<div class="empty-agents">
                Belum ada agent yang disimpan.
            </div>`;

        return;
    }


    container.innerHTML =
        agents.map(agent => {

            const tools =
                Array.isArray(agent.tools)
                    ? agent.tools
                    : [];


            const toolText =
                tools.length > 0

                    ? tools
                        .map(
                            tool =>
                                `${TOOL_INFO[tool]?.icon || "🔧"} ${
                                    TOOL_INFO[tool]?.name || tool
                                }`
                        )
                        .join(" • ")

                    : "Tidak ada tool";


            return `

                <div class="agent-card">

                    <h3>
                        🤖 ${escapeHtml(agent.name)}
                    </h3>

                    <p>
                        ${escapeHtml(agent.instruction)}
                    </p>

                    <div class="agent-tools">
                        🔧 ${escapeHtml(toolText)}
                    </div>

                    <div class="agent-card-buttons">

                        <button
                            class="open-agent"
                            onclick="openAgent(${agent.id})">
                            BUKA
                        </button>

                        <button
                            class="delete-agent"
                            onclick="deleteAgent(${agent.id})">
                            HAPUS
                        </button>

                    </div>

                </div>

            `;

        }).join("");
}


/* =========================
   OPEN AGENT
========================= */

function openAgent(id) {

    const agents =
        getSavedAgents();


    const agent =
        agents.find(
            item => item.id === id
        );


    if (!agent) return;


    document.getElementById(
        "agentName"
    ).value =
        agent.name;


    document.getElementById(
        "agentInstruction"
    ).value =
        agent.instruction;


    document.getElementById(
        "agentTask"
    ).value =
        agent.task || "";


    setSelectedTools(
        Array.isArray(agent.tools)
            ? agent.tools
            : []
    );


    const toolText =
        Array.isArray(agent.tools) &&
        agent.tools.length > 0

            ? agent.tools
                .map(
                    tool =>
                        TOOL_INFO[tool]?.name ||
                        tool
                )
                .join(", ")

            : "Tidak ada tool";


    document.getElementById(
        "result"
    ).innerText =

        `🤖 Agent "${agent.name}" berhasil dimuat.\n\n` +

        `🔧 Tools: ${toolText}\n\n` +

        "Masukkan API Key jika diperlukan, lalu jalankan agent.";


    document.getElementById(
        "statusText"
    ).innerText =
        "Agent Loaded";


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================
   DELETE AGENT
========================= */

function deleteAgent(id) {

    const agents =
        getSavedAgents();


    const agent =
        agents.find(
            item => item.id === id
        );


    if (!agent) return;


    const confirmDelete =
        confirm(
            `Hapus agent "${agent.name}"?`
        );


    if (!confirmDelete) return;


    const updatedAgents =
        agents.filter(
            item => item.id !== id
        );


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedAgents)
    );


    renderAgents();


    document.getElementById(
        "result"
    ).innerText =
        `🗑️ Agent "${agent.name}" telah dihapus.`;


    document.getElementById(
        "statusText"
    ).innerText =
        "Agent Deleted";
}


/* =========================
   SECURITY
========================= */

function escapeHtml(value) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}


/* =========================
   STARTUP
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        renderAgents();

        updateToolUI();

    }
);
