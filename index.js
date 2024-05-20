import selfcore from "selfcore";
import Parse from 'parse/node.js';
import xlsx from 'xlsx';

// Inicialize o Parse com suas credenciais
Parse.initialize(
  "", // Application ID
  "",  // Javascript key
);
Parse.serverURL = 'https://parseapi.back4app.com/';

// Token e ID do canal do Discord
const TOKEN = "";  // Certifique-se de manter este token seguro e não compartilhar publicamente
const CHANNEL_ID = "";

// Mapeamento entre nomes completos do Excel e nomes de usuário do Discord
const userMapping = {
  "David ": "davinbjj",
};

// Inicialização do cliente do Discord
const client = new selfcore();
const gateway = new selfcore.Gateway(TOKEN);

gateway.on("message", (m) => {
  if (m.channel_id === CHANNEL_ID) {
    let content = m.content;

    // Processar a mensagem e enviar os dados para o banco de dados
    parseAndLogMessage(content);
  }
});

// Função para processar a mensagem e exibir o nome dos usuários e seus respectivos XP
function parseAndLogMessage(message) {
  console.log('Processando mensagem:', message);

  // Expressão regular para encontrar os usuários e seus respectivos XP
  const regex = /#\d+\s+([^\s]+)\s+🎖\d+\nTotal:\s+(\d+)\s+XP/g;
  let match;

  // Loop para encontrar todas as ocorrências e enviar os resultados para o banco de dados
  while ((match = regex.exec(message)) !== null) {
    const user = match[1];
    const xp = match[2];
    console.log(`Usuário: ${user}`);
    console.log(`O XP de ${user}: ${xp}`);

    // Enviar os dados para o banco de dados
    sendToDatabase(user, parseInt(xp));
  }
}

// Função para enviar os dados para o banco de dados
async function sendToDatabase(user, xp) {
  const SaldoMembros = Parse.Object.extend("SaldoMembros");
  const query = new Parse.Query(SaldoMembros);

  // Encontre o nome completo correspondente ao usuário do Discord
  const fullName = Object.keys(userMapping).find(key => userMapping[key] === user) || "";

  query.equalTo("usuarioDiscord", user);
  try {
    const results = await query.find();
    if (results.length > 0) {
      // Usuário já existe, atualizar XP
      const saldoMembros = results[0];
      const currentXP = saldoMembros.get("XPDiscord") || 0;
      saldoMembros.set("XPDiscord", currentXP + xp);
      await saldoMembros.save();
      console.log(`XP de ${user} atualizado para ${currentXP + xp} XP com sucesso.`);
    } else {
      // Usuário não existe, criar novo registro
      const saldoMembros = new SaldoMembros();
      saldoMembros.set("usuarioDiscord", user);
      saldoMembros.set("XPDiscord", xp);
      saldoMembros.set("nomeCompleto", fullName);

      await saldoMembros.save();
      console.log(`Dados de ${user} (${xp} XP) salvos com sucesso.`);
    }
  } catch (error) {
    console.error(`Erro ao salvar ou atualizar os dados de ${user} (${xp} XP):`, error);
  }
}

// Função para carregar o arquivo Excel
function loadExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet, { header: 1 });
}

// Função para enviar dados do Excel para o banco de dados
async function sendExcelDataToBack4App(row, headers) {
  const SaldoMembros = Parse.Object.extend('SaldoMembros');
  const saldoMembrosInstance = new SaldoMembros();

  const membroIndex = headers.indexOf('Membro');
  const saldoIndex = headers.indexOf('saldo total');

  if (membroIndex === -1 || saldoIndex === -1) {
    console.error('As colunas "Membro" e "saldo total" não foram encontradas.');
    return;
  }

  const fullName = row[membroIndex];
  const discordUser = userMapping[fullName];

  saldoMembrosInstance.set('nomeCompleto', fullName);
  saldoMembrosInstance.set('usuarioDiscord', discordUser || '');
  saldoMembrosInstance.set('saldo_total', row[saldoIndex]);

  try {
    await saldoMembrosInstance.save();
    console.log('Dados salvos com sucesso:', {
      nomeCompleto: fullName,
      usuarioDiscord: discordUser,
      saldo_total: row[saldoIndex]
    });
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
}

// Função para enviar todos os dados do Excel para o banco de dados
async function sendAllExcelDataToBack4App(data) {
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    await sendExcelDataToBack4App(row, headers);
  }
}

// Função principal para ler o arquivo Excel e enviar os dados
async function main() {
  const filePath = 'Arquivo.xlsx';

  try {
    const data = loadExcelFile(filePath);
    await sendAllExcelDataToBack4App(data);
  } catch (error) {
    console.error('Erro ao ler o arquivo Excel:', error);
  }
}

// Iniciar o processamento do arquivo Excel
main();
