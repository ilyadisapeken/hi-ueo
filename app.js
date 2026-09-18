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
            "Menghitung operasi matematika."
    },

    text_processor: {
        name: "Text Processor",
        icon: "📝",
        description:
            "Mengolah, meringkas, memperbaiki, dan menyusun teks."
    },

    web_search: {
        name: "Web Search",
        icon: "🌐",
        description:
            "Kemampuan untuk pencarian informasi web."
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


/* ==================================================
   REAL CALCULATOR TOOL
================================================== */

/*
   Calculator hanya menerima karakter matematika
   yang aman:

   angka
   + - * / %
   kurung
   titik
   spasi

   Contoh:
   100 + 50
   1000000 * 15 / 100
   (500 + 250) * 2
*/


function calculateExpression(expression) {

    if (!expression) {
        throw new Error(
            "Ekspresi matematika kosong."
        );
    }


    let clean =
        String(expression)
            .replace(/,/g, "")
            .replace(/\s+/g, "");


    /*
       Hanya izinkan angka dan operator matematika.
    */

    if (!/^[0-9+\-*/().%]+$/.test(clean)) {

        throw new Error(
            "Ekspresi mengandung karakter yang tidak didukung."
        );
    }


    /*
       Cegah pola operator yang berbahaya
       atau tidak valid.
    */

    if (
        clean.includes("**") ||
        clean.includes("//")
    ) {

        throw new Error(
            "Operator matematika tidak valid."
        );
    }


    try {

        /*
           Karena ekspresi sudah melewati whitelist
           karakter matematika, evaluasi hanya dilakukan
           terhadap ekspresi tersebut.
        */

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


/* =========================
   FIND CALCULATIONS
========================= */

function findCalculationExpressions(text) {

    const expressions = [];


    /*
       Mencari pola sederhana seperti:

       100 + 200
       1000 * 15 / 100
       (100 + 200) * 2
    */

    const matches =
        text.match(
            /(?:?\d+(?:[.,]\d+)??\s*(?:[+\-*/%]\s*?\d+(?:[.,]\d+)??)+)/g
        );


    if (!matches) {
        return expressions;
    }


    matches.forEach(expression => {

        const normalized =
            expression.replace(/,/g, "");


        if (!expressions.includes(normalized)) {

            expressions.push(
                normalized
            );
        }

    });


    return expressions;
}


/* =========================
   RUN CALCULATOR
========================= */

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
                calculateExpression(
                    expression
                );


            results.push({

                expression:
                    expression,

                result:
                    value

            });

        } catch (error) {

            results.push({

                expression:
                    expression,

                error:
                    error.message

            });

        }

    }


    return {

        used: true,

        results:
            results

    };
}


/* =========================
   BUILD CALCULATOR CONTEXT
========================= */

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

            if (tool === "calculator") {

                return `
- Calculator: HI-UEO dapat melakukan perhitungan
  matematika secara langsung sebelum meminta Gemini
  menyusun jawaban.
`;
            }


            if (tool === "text_processor") {

                return `
- Text Processor: digunakan untuk mengolah teks seperti
  meringkas, memperbaiki, menyusun, atau mengubah gaya teks.
`;
            }


            if (tool === "web_search") {

                return `
- Web Search: disiapkan untuk pencarian informasi web.
  Pada versi ini koneksi ke mesin pencari eksternal
  belum tersedia. Jangan mengklaim telah browsing internet.
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


    /*
       Jika Calculator aktif,
       jalankan Calculator terlebih dahulu.
    */

    const calculatorContext =
        selectedTools.includes("calculator")
            ? buildCalculatorContext(task)
            : "";


    const prompt = `
Kamu adalah AI Agent bernama "${getAgentName()}".

INSTRUKSI AGENT:
${instruction}

TUGAS PENGGUNA:
${task}

${toolInstructions}

${calculatorContext}

ATURAN:
1. Pahami instruksi agent.
2. Kerjakan tugas pengguna secara langsung.
3. Jangan menjelaskan proses internalmu.
4. Berikan hasil yang jelas dan terstruktur.
5. Gunakan bahasa Indonesia kecuali pengguna meminta bahasa lain.
6. Gunakan tool yang tersedia jika relevan.
7. Jika terdapat HASIL CALCULATOR HI-UEO, gunakan hasil tersebut dan jangan mengubah angka hasil perhitungan.
8. Jangan mengklaim menggunakan tool eksternal yang sebenarnya tidak tersedia.
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


    let calculatorPreview = "";


    if (
        selectedTools.includes("calculator")
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


    result.innerText =
        "🤖 HI-UEO sedang bekerja...\n\n" +
        (
            selectedTools.length > 0
                ? `🔧 Tools aktif: ${selectedTools
                    .map(tool =>
                        TOOL_INFO[tool]?.name || tool
                    )
                    .join(", ")}\n`
                : ""
        ) +
        calculatorPreview +
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
        document.get
