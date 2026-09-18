const GEMINI_MODEL = "gemini-3.1-flash-lite";

const STORAGE_KEY = "hi_ueo_agents";


/* =========================
   TOOL INFORMATION
========================= */

const TOOL_INFO = {

    calculator: {
        name: "Calculator",
        icon: "🧮",
        description:
            "Membantu melakukan perhitungan matematika."
    },

    text_processor: {
        name: "Text Processor",
        icon: "📝",
        description:
            "Membantu mengolah, meringkas, memperbaiki, dan menyusun teks."
    },

    web_search: {
        name: "Web Search",
        icon: "🌐",
        description:
            "Kemampuan yang disiapkan untuk kebutuhan pencarian informasi web."
    }

};


/* =========================
   GET AGENT NAME
========================= */

function getAgentName() {

    const element =
        document.getElementById("agentName");

    return element?.value?.trim() ||
        "HI-UEO Agent";
}


/* =========================
   TOOL TOGGLE
========================= */

function toggleTool(card) {

    if (!card) {
        return;
    }

    card.classList.toggle("active");

    updateToolUI();
}


/* =========================
   GET SELECTED TOOLS
========================= */

function getSelectedTools() {

    return Array.from(
        document.querySelectorAll(".tool-card.active")
    ).map(card =>
        card.dataset.tool
    );
}


/* =========================
   UPDATE TOOL UI
========================= */

function updateToolUI() {

    const selectedTools =
        getSelectedTools();

    const status =
        document.getElementById("toolStatus");


    if (!status) {
        return;
    }


    if (selectedTools.length === 0) {

        status.innerText =
            "🔧 Belum ada tool dipilih.";

        return;
    }


    const names =
        selectedTools.map(tool =>
            TOOL_INFO[tool]?.name || tool
        );


    status.innerText =
        `🔧 ${selectedTools.length} tool aktif: ` +
        names.join(", ");
}


/* =========================
   SET SELECTED TOOLS
========================= */

function setSelectedTools(tools) {

    const selected =
        Array.isArray(tools)
            ? tools
            : [];


    document
        .querySelectorAll(".tool-card")
        .forEach(card => {

            const tool =
                card.dataset.tool;

            card.classList.toggle(
                "active",
                selected.includes(tool)
            );

        });


    updateToolUI();
}


/* =========================
   BUILD TOOL PROMPT
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

            const info =
                TOOL_INFO[tool];

            if (!info) {
                return "";
            }

            if (tool === "calculator") {

                return `
- Calculator: Gunakan kemampuan penalaran matematika
  untuk menghitung angka dengan teliti.
`;
            }


            if (tool === "text_processor") {

                return `
- Text Processor: Fokus pada pengolahan teks seperti
  meringkas, memperbaiki, menyusun, atau mengubah gaya teks.
`;
            }


            if (tool === "web_search") {

                return `
- Web Search: Agent ditandai memiliki kebutuhan pencarian
  informasi web. Namun pada versi HI-UEO ini belum ada
  koneksi langsung ke mesin pencari eksternal. Jangan
  mengklaim telah melakukan pencarian internet jika memang
  tidak dilakukan.
`;
            }


            return `
- ${info.name}: ${info.description}
`;
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


    const prompt = `
Kamu adalah AI Agent bernama "${getAgentName()}".

INSTRUKSI AGENT:
${instruction}

TUGAS PENGGUNA:
${task}

${toolInstructions}

ATURAN:
1. Pahami instruksi agent.
2. Kerjakan tugas pengguna secara langsung.
3. Jangan menjelaskan proses internalmu.
4. Berikan hasil yang jelas dan terstruktur.
5. Gunakan bahasa Indonesia kecuali pengguna meminta bahasa lain.
6. Gunakan tool yang tersedia jika relevan.
7. Jangan mengklaim menggunakan tool eksternal yang sebenarnya tidak tersedia.
`;


    const response =
        await fetch(
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
        document.getElementById("apiKey")
            .value.trim();

    const name =
        document.getElementById("agentName")
            .value.trim();

    const instruction =
        document.getElementById("agentInstruction")
            .value.trim();

    const task =
        document.getElementById("agentTask")
            .value.trim();

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


    result.innerText =
        "🤖 HI-UEO sedang menghubungi Gemini...\n\n" +
        (
            selectedTools.length > 0
                ? `🔧 Tools aktif: ${selectedTools
                    .map(tool => TOOL_INFO[tool]?.name || tool)
                    .join(", ")}\n\n`
                : ""
        ) +
        "Mohon tunggu.";


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
            "\n\n" +
            "Periksa API Key dan koneksi internet.";

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
        document.getElementById("agentName")
            .value.trim();

    const instruction =
        document.getElementById("agentInstruction")
            .value.trim();

    const task =
        document.getElementById("agentTask")
            .value.trim();

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

        id:
            Date.now(),

        name:
            name,

        instruction:
            instruction,

        task:
            task,

        tools:
            selectedTools,

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
                    .map(tool =>
                        TOOL_INFO[tool]?.name || tool
                    )
                    .join(", ")
                : "Tidak menggunakan tool."
        );


    statusText.innerText =
        "Agent Saved";


    renderAgents();
}


/* =========================
   GET SAVED AGENTS
========================= */

function getSavedAgents() {

    try {

        const data =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!data) {
            return [];
        }


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


/* =========================
   DISPLAY AGENTS
========================= */

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

        container.innerHTML = `
            <div class="empty-agents">
                Belum ada agent yang disimpan.
            </div>
        `;

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
                    ? tools.map(tool =>
                        `${TOOL_INFO[tool]?.icon || "🔧"} ${TOOL_INFO[tool]?.name || tool}`
                      ).join(" • ")
                    : "Tidak ada tool";


            return `

                <div class="agent-card">

                    <h3>
                        🤖 ${escapeHtml(agent.name)}
                    </h3>

                    <p>
                        ${escapeHtml(
                            agent.instruction
                        )}
                    </p>

                    <div class="agent-tools">
                        🔧 ${escapeHtml(toolText)}
                    </div>

                    <div class="agent-card-buttons">

                        <button
                            class="open-agent"
                            onclick="openAgent(${agent.id})"
                        >
                            BUKA
                        </button>

                        <button
                            class="delete-agent"
                            onclick="deleteAgent(${agent.id})"
                        >
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


    if (!agent) {
        return;
    }


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


    /*
    Restore tools.
    Agent lama yang belum memiliki
    property tools otomatis dianggap
    tidak memiliki tool.
    */

    setSelectedTools(
        Array.isArray(agent.tools)
            ? agent.tools
            : []
    );


    const toolText =
        Array.isArray(agent.tools) &&
        agent.tools.length > 0

            ? agent.tools
                .map(tool =>
                    TOOL_INFO[tool]?.name || tool
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


    if (!agent) {
        return;
    }


    const confirmDelete =
        confirm(
            `Hapus agent "${agent.name}"?`
        );


    if (!confirmDelete) {
        return;
    }


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
   START APP
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        renderAgents();

        updateToolUI();

    }
);
