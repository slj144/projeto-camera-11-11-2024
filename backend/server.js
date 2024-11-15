const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const app = express();

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Criar pasta uploads se não existir
const fs = require('fs');
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Modelo do Documento Legislativo
const documentoLegislativoSchema = new mongoose.Schema({
  numero: { type: String, required: true },
  ano: { type: Number, required: true },
  dataApresentacao: { type: Date, default: Date.now },
  autor: { type: String, required: true },
  assunto: { type: String, required: true },
  situacao: { 
    type: String, 
    enum: ['Em Tramitação', 'Aprovado', 'Rejeitado', 'Arquivado'],
    default: 'Em Tramitação'
  },
  conteudo: { type: String, required: true },
  observacoes: String,
  anexos: [String],
  tipo: { 
    type: String, 
    required: true,
    enum: ['Requerimento', 'Ofício', 'Indicação', 'Moção', 'Projeto']
  }
});

const DocumentoLegislativo = mongoose.model('DocumentoLegislativo', documentoLegislativoSchema);

// Rotas para Documentos
app.post('/api/documentos', upload.array('anexos'), async (req, res) => {
  try {
    const documento = new DocumentoLegislativo({
      ...req.body,
      anexos: req.files ? req.files.map(file => `/uploads/${file.filename}`) : []
    });
    await documento.save();
    res.status(201).json(documento);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/documentos', async (req, res) => {
  try {
    const { tipo, autor, situacao, ano } = req.query;
    let filtro = {};
    
    if (tipo) filtro.tipo = tipo;
    if (autor) filtro.autor = autor;
    if (situacao) filtro.situacao = situacao;
    if (ano) filtro.ano = parseInt(ano);

    const documentos = await DocumentoLegislativo.find(filtro)
      .sort({ dataApresentacao: -1 });
    res.json(documentos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documentos/:id', async (req, res) => {
  try {
    const documento = await DocumentoLegislativo.findById(req.params.id);
    if (!documento) {
      return res.status(404).json({ message: 'Documento não encontrado' });
    }
    res.json(documento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/documentos/:id', upload.array('anexos'), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.files && req.files.length > 0) {
      updateData.anexos = req.files.map(file => `/uploads/${file.filename}`);
    }
    const documento = await DocumentoLegislativo.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    res.json(documento);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Conectado ao MongoDB');
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Erro ao conectar com MongoDB:', error);
  });
  // Modelo da Agenda
const agendaSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  dataEvento: { type: Date, required: true },
  horaInicio: { type: String, required: true },
  horaFim: { type: String, required: true },
  local: { type: String, required: true },
  tipo: { 
    type: String, 
    enum: ['Sessão Ordinária', 'Sessão Extraordinária', 'Reunião', 'Audiência Pública', 'Evento'],
    required: true
  },
  descricao: String,
  participantes: [String],
  status: {
    type: String,
    enum: ['Agendado', 'Em Andamento', 'Concluído', 'Cancelado'],
    default: 'Agendado'
  },
  dataCriacao: { type: Date, default: Date.now },
  responsavel: String,
  observacoes: String
});

const Agenda = mongoose.model('Agenda', agendaSchema);

// Rotas para Agenda
app.post('/api/agenda', async (req, res) => {
  try {
    const evento = new Agenda(req.body);
    await evento.save();
    res.status(201).json(evento);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/agenda', async (req, res) => {
  try {
    const { tipo, status, dataInicio, dataFim } = req.query;
    let filtro = {};
    
    if (tipo) filtro.tipo = tipo;
    if (status) filtro.status = status;
    if (dataInicio || dataFim) {
      filtro.dataEvento = {};
      if (dataInicio) filtro.dataEvento.$gte = new Date(dataInicio);
      if (dataFim) filtro.dataEvento.$lte = new Date(dataFim);
    }

    const eventos = await Agenda.find(filtro).sort({ dataEvento: 1 });
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agenda/:id', async (req, res) => {
  try {
    const evento = await Agenda.findById(req.params.id);
    if (!evento) {
      return res.status(404).json({ message: 'Evento não encontrado' });
    }
    res.json(evento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/agenda/:id', async (req, res) => {
  try {
    const evento = await Agenda.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(evento);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/agenda/:id', async (req, res) => {
  try {
    await Agenda.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para eventos do dia
app.get('/api/agenda/eventos/hoje', async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const eventos = await Agenda.find({
      dataEvento: {
        $gte: hoje,
        $lt: amanha
      }
    }).sort({ horaInicio: 1 });

    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Adicione isso antes das rotas de relatórios
// Modelo do Eleitor
const eleitorSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  dataNascimento: { type: Date, required: true },
  endereco: { type: String, required: true },
  bairro: { type: String, required: true },
  telefone: { type: String, required: true },
  email: String,
  observacoes: String,
  foto: String,
  dataCadastro: { type: Date, default: Date.now }
});

const Eleitor = mongoose.model('Eleitor', eleitorSchema);

// CRUD Eleitores
app.post('/api/eleitores', upload.single('foto'), async (req, res) => {
  try {
    const eleitor = new Eleitor({
      ...req.body,
      foto: req.file ? `/uploads/${req.file.filename}` : null
    });
    await eleitor.save();
    res.status(201).json(eleitor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/eleitores', async (req, res) => {
  try {
    const eleitores = await Eleitor.find().sort({ dataCadastro: -1 });
    res.json(eleitores);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para relatórios de eleitores
app.get('/api/relatorios/eleitores', async (req, res) => {
  try {
    // Adicionar log para debugar
    console.log('Iniciando geração de relatório...');
    
    const periodo = parseInt(req.query.periodo) || 30;
    console.log('Período:', periodo);
    
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - periodo);
    console.log('Data limite:', dataLimite);

    // Total de eleitores
    const totalEleitores = await Eleitor.countDocuments();
    console.log('Total de eleitores:', totalEleitores);

    // Eleitores por bairro
    const porBairro = await Eleitor.aggregate([
      {
        $group: {
          _id: '$bairro',
          quantidade: { $sum: 1 }
        }
      },
      {
        $project: {
          nome: '$_id',
          quantidade: 1,
          _id: 0
        }
      },
      {
        $sort: { quantidade: -1 }
      }
    ]);
    console.log('Por bairro:', porBairro);

    // Aniversariantes do mês atual
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const aniversariantes = await Eleitor.find({
      $expr: {
        $eq: [{ $month: '$dataNascimento' }, mesAtual]
      }
    }).sort('dataNascimento');
    console.log('Aniversariantes:', aniversariantes.length);

    // Novos cadastros no período
    const novosCadastros = await Eleitor.find({
      dataCadastro: { $gte: dataLimite }
    }).sort('-dataCadastro');
    console.log('Novos cadastros:', novosCadastros.length);

    res.json({
      totalEleitores,
      porBairro,
      aniversariantes,
      novosCadastros
    });

  } catch (error) {
    // Log detalhado do erro
    console.error('Erro detalhado ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório', detalhes: error.message });
  }
});