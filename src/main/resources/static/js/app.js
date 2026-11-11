// ===================== Utilitarios =====================

async function api(metodo, url, corpo) {
    const opcoes = { method: metodo, headers: {} };
    if (corpo !== undefined) {
        opcoes.headers['Content-Type'] = 'application/json';
        opcoes.body = JSON.stringify(corpo);
    }
    const resposta = await fetch(url, opcoes);
    if (resposta.status === 204) return null;
    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) throw dados || { erro: 'Erro ' + resposta.status };
    return dados;
}

function esc(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatarData(data) {
    return data ? new Date(data).toLocaleString('pt-BR') : '-';
}

function badge(valor) {
    return `<span class="badge ${esc(valor)}">${esc(valor).replace('_', ' ')}</span>`;
}

function aviso(texto, tipo = 'ok') {
    const el = document.getElementById('aviso');
    el.textContent = texto;
    el.className = tipo;
    clearTimeout(el.timer);
    el.timer = setTimeout(() => el.className = '', 3500);
}

function mensagemErro(erro) {
    let texto = erro.erro || 'Erro inesperado';
    if (erro.detalhes && erro.detalhes.length) texto += ': ' + erro.detalhes.join(', ');
    return texto;
}

function fecharModal(id) {
    document.getElementById(id).close();
}

// ===================== Abas =====================

document.querySelectorAll('.aba').forEach(botao => {
    botao.addEventListener('click', () => {
        document.querySelectorAll('.aba').forEach(b => b.classList.remove('ativa'));
        document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
        botao.classList.add('ativa');
        document.getElementById(botao.dataset.aba).classList.add('ativa');
        carregarAba(botao.dataset.aba);
    });
});

function carregarAba(aba) {
    if (aba === 'inicio') carregarInicio();
    else if (aba === 'chamados') carregarChamados();
    else carregarCadastro(aba);
}

function irPara(aba) {
    document.querySelector(`.aba[data-aba="${aba}"]`).click();
}

// ===================== Inicio (dashboard) =====================

const STATUS = ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', 'FECHADO'];
const PRIORIDADES = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
const CORES = {
    ABERTO: '#2563eb', EM_ATENDIMENTO: '#d97706', AGUARDANDO_CLIENTE: '#7c3aed', FECHADO: '#6b7280',
    BAIXA: '#16a34a', MEDIA: '#ca8a04', ALTA: '#ea580c', CRITICA: '#dc2626'
};

// usa a paginacao da API: com size=1 o totalElements ja traz a contagem
async function contarChamados(filtro) {
    const resultado = await api('GET', `/chamados?size=1&${filtro}`);
    return resultado.page.totalElements;
}

function grafico(id, filtro, valores, totais) {
    const maior = Math.max(...totais, 1);
    document.getElementById(id).innerHTML = valores.map((v, i) => `
        <div class="barra" onclick="filtrarChamados('${filtro}', '${v}')">
            <span>${v.replace('_', ' ')}</span>
            <div class="trilho"><div class="preenchido" style="width:${totais[i] / maior * 100}%; background:${CORES[v]}"></div></div>
            <b>${totais[i]}</b>
        </div>`).join('');
}

function filtrarChamados(campo, valor) {
    document.getElementById('filtroStatus').value = campo === 'status' ? valor : '';
    document.getElementById('filtroPrioridade').value = campo === 'prioridade' ? valor : '';
    document.getElementById('filtroCliente').value = '';
    pagina = 0;
    irPara('chamados');
}

async function carregarInicio() {
    try {
        const [total, porStatus, porPrioridade, clientes, categorias, tecnicos, ultimos] = await Promise.all([
            contarChamados(''),
            Promise.all(STATUS.map(s => contarChamados('status=' + s))),
            Promise.all(PRIORIDADES.map(p => contarChamados('prioridade=' + p))),
            api('GET', '/clientes'),
            api('GET', '/categorias'),
            api('GET', '/tecnicos'),
            api('GET', '/chamados?status=ABERTO&size=5&sort=dataAbertura,desc')
        ]);

        const cards = [
            ['Total de chamados', total, 'chamados'],
            ['Em aberto', porStatus[0], 'chamados'],
            ['Em atendimento', porStatus[1], 'chamados'],
            ['Clientes', clientes.length, 'clientes'],
            ['Categorias', categorias.length, 'categorias'],
            ['Técnicos', tecnicos.length, 'tecnicos']
        ];
        document.getElementById('cardsTotais').innerHTML = cards.map(([nome, valor, aba]) =>
            `<div class="card" onclick="irPara('${aba}')"><span>${nome}</span><b>${valor}</b></div>`).join('');

        grafico('graficoStatus', 'status', STATUS, porStatus);
        grafico('graficoPrioridade', 'prioridade', PRIORIDADES, porPrioridade);

        document.getElementById('ultimosChamados').innerHTML = ultimos.content.length
            ? ultimos.content.map(c => `
                <tr class="clicavel" onclick="abrirChamado(${c.id})">
                    <td>${c.id}</td>
                    <td>${esc(c.titulo)}</td>
                    <td>${esc(c.clienteNome)}</td>
                    <td>${badge(c.prioridade)}</td>
                    <td>${badge(c.status)}</td>
                    <td>${formatarData(c.dataAbertura)}</td>
                </tr>`).join('')
            : `<tr><td colspan="6" class="vazio">Nenhum chamado em aberto</td></tr>`;
    } catch (e) {
        aviso(mensagemErro(e), 'erro');
    }
}

// recarrega a tela que estiver aberta depois de uma alteracao em chamado
function atualizarTelaChamados() {
    if (document.getElementById('inicio').classList.contains('ativa')) carregarInicio();
    else carregarChamados();
}

// ===================== Cadastros simples =====================

const cadastros = {
    clientes: {
        titulo: 'cliente',
        tabela: 'listaClientes',
        colunas: c => [c.id, c.nome, c.email, c.telefone],
        campos: [
            { nome: 'nome', rotulo: 'Nome' },
            { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
            { nome: 'telefone', rotulo: 'Telefone' }
        ]
    },
    categorias: {
        titulo: 'categoria',
        tabela: 'listaCategorias',
        colunas: c => [c.id, c.nome, c.descricao],
        campos: [
            { nome: 'nome', rotulo: 'Nome' },
            { nome: 'descricao', rotulo: 'Descrição', tipo: 'textarea' }
        ]
    },
    tecnicos: {
        titulo: 'técnico',
        tabela: 'listaTecnicos',
        colunas: t => [t.id, t.nome, t.email, t.perfil],
        campos: [
            { nome: 'nome', rotulo: 'Nome' },
            { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
            { nome: 'perfil', rotulo: 'Perfil', opcoes: ['TECNICO', 'ADMIN'] }
        ]
    }
};

async function carregarCadastro(recurso) {
    const config = cadastros[recurso];
    const corpo = document.getElementById(config.tabela);
    try {
        const lista = await api('GET', '/' + recurso);
        if (!lista.length) {
            corpo.innerHTML = `<tr><td colspan="5" class="vazio">Nenhum registro cadastrado</td></tr>`;
            return;
        }
        corpo.innerHTML = lista.map(item => `
            <tr>
                ${config.colunas(item).map(v => `<td>${esc(v)}</td>`).join('')}
                <td class="acoes-linha">
                    <button class="pequeno" onclick="abrirForm('${recurso}', ${item.id})">Editar</button>
                    <button class="pequeno perigo" onclick="excluir('${recurso}', ${item.id})">Excluir</button>
                </td>
            </tr>`).join('');
    } catch (e) {
        aviso(mensagemErro(e), 'erro');
    }
}

async function abrirForm(recurso, id) {
    const config = cadastros[recurso];
    let item = {};
    if (id) {
        try { item = await api('GET', `/${recurso}/${id}`); }
        catch (e) { aviso(mensagemErro(e), 'erro'); return; }
    }
    montarForm(
        (id ? 'Editar ' : 'Novo ') + config.titulo,
        config.campos,
        item,
        dados => id ? api('PUT', `/${recurso}/${id}`, dados) : api('POST', '/' + recurso, dados),
        () => carregarCadastro(recurso)
    );
}

async function excluir(recurso, id) {
    if (!confirm('Deseja realmente excluir o registro #' + id + '?')) return;
    try {
        await api('DELETE', `/${recurso}/${id}`);
        aviso('Registro excluído');
        carregarCadastro(recurso);
    } catch (e) {
        aviso(mensagemErro(e), 'erro');
    }
}

// ===================== Formulario generico =====================

function montarForm(titulo, campos, valores, salvar, depois) {
    document.getElementById('tituloForm').textContent = titulo;
    document.getElementById('errosForm').innerHTML = '';
    document.getElementById('camposForm').innerHTML = campos.map(c => {
        const valor = valores[c.nome] ?? '';
        let input;
        if (c.opcoes) {
            input = `<select name="${c.nome}">
                ${c.vazio ? `<option value="">${c.vazio}</option>` : ''}
                ${c.opcoes.map(o => {
                    const v = typeof o === 'object' ? o.valor : o;
                    const t = typeof o === 'object' ? o.texto : o;
                    return `<option value="${esc(v)}" ${String(v) === String(valor) ? 'selected' : ''}>${esc(t)}</option>`;
                }).join('')}
            </select>`;
        } else if (c.tipo === 'textarea') {
            input = `<textarea name="${c.nome}">${esc(valor)}</textarea>`;
        } else {
            input = `<input name="${c.nome}" type="${c.tipo || 'text'}" value="${esc(valor)}">`;
        }
        return `<div class="campo"><label>${c.rotulo}</label>${input}</div>`;
    }).join('');

    const form = document.getElementById('form');
    form.onsubmit = async evento => {
        evento.preventDefault();
        const dados = {};
        new FormData(form).forEach((v, k) => dados[k] = v === '' ? null : v);
        try {
            await salvar(dados);
            fecharModal('modalForm');
            aviso('Salvo com sucesso');
            depois();
        } catch (e) {
            const detalhes = (e.detalhes || []).map(d => `<li>${esc(d)}</li>`).join('');
            document.getElementById('errosForm').innerHTML =
                `<b>${esc(e.erro || 'Erro')}</b>${detalhes ? `<ul>${detalhes}</ul>` : ''}`;
        }
    };
    document.getElementById('modalForm').showModal();
}

// ===================== Chamados =====================

let pagina = 0;

async function carregarChamados() {
    const params = new URLSearchParams({ page: pagina, size: 10, sort: document.getElementById('ordenacao').value });
    const status = document.getElementById('filtroStatus').value;
    const prioridade = document.getElementById('filtroPrioridade').value;
    const clienteId = document.getElementById('filtroCliente').value;
    if (status) params.append('status', status);
    if (prioridade) params.append('prioridade', prioridade);
    if (clienteId) params.append('clienteId', clienteId);

    const corpo = document.getElementById('listaChamados');
    try {
        const resultado = await api('GET', '/chamados?' + params);
        const info = resultado.page;
        if (!resultado.content.length) {
            corpo.innerHTML = `<tr><td colspan="8" class="vazio">Nenhum chamado encontrado</td></tr>`;
        } else {
            corpo.innerHTML = resultado.content.map(c => `
                <tr class="clicavel" onclick="abrirChamado(${c.id})">
                    <td>${c.id}</td>
                    <td>${esc(c.titulo)}</td>
                    <td>${esc(c.clienteNome)}</td>
                    <td>${esc(c.categoriaNome)}</td>
                    <td>${esc(c.tecnicoNome) || '<i>sem técnico</i>'}</td>
                    <td>${badge(c.prioridade)}</td>
                    <td>${badge(c.status)}</td>
                    <td>${formatarData(c.dataAbertura)}</td>
                </tr>`).join('');
        }
        const total = Math.max(info.totalPages, 1);
        document.getElementById('infoPagina').textContent =
            `Página ${info.number + 1} de ${total} (${info.totalElements} chamados)`;
        document.getElementById('btnAnterior').disabled = info.number === 0;
        document.getElementById('btnProxima').disabled = info.number + 1 >= total;
    } catch (e) {
        aviso(mensagemErro(e), 'erro');
    }
}

async function carregarFiltroClientes() {
    const select = document.getElementById('filtroCliente');
    try {
        const clientes = await api('GET', '/clientes');
        select.innerHTML = '<option value="">Todos os clientes</option>' +
            clientes.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
    } catch (e) { /* ignora */ }
}

async function camposChamado() {
    const [clientes, categorias, tecnicos] = await Promise.all([
        api('GET', '/clientes'), api('GET', '/categorias'), api('GET', '/tecnicos')
    ]);
    return [
        { nome: 'titulo', rotulo: 'Título' },
        { nome: 'descricao', rotulo: 'Descrição', tipo: 'textarea' },
        { nome: 'prioridade', rotulo: 'Prioridade', opcoes: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] },
        { nome: 'clienteId', rotulo: 'Cliente', vazio: 'Selecione...', opcoes: clientes.map(c => ({ valor: c.id, texto: c.nome })) },
        { nome: 'categoriaId', rotulo: 'Categoria', vazio: 'Selecione...', opcoes: categorias.map(c => ({ valor: c.id, texto: c.nome })) },
        { nome: 'tecnicoId', rotulo: 'Técnico (opcional)', vazio: 'Sem técnico', opcoes: tecnicos.map(t => ({ valor: t.id, texto: t.nome })) }
    ];
}

async function abrirFormChamado(id) {
    try {
        const campos = await camposChamado();
        const chamado = id ? await api('GET', '/chamados/' + id) : {};
        if (id) fecharModal('modalChamado');
        montarForm(
            id ? 'Editar chamado #' + id : 'Novo chamado',
            campos,
            chamado,
            dados => id ? api('PUT', '/chamados/' + id, dados) : api('POST', '/chamados', dados),
            () => { atualizarTelaChamados(); if (id) abrirChamado(id); }
        );
    } catch (e) {
        aviso(mensagemErro(e), 'erro');
    }
}

async function abrirChamado(id) {
    try {
        const [c, comentarios, tecnicos] = await Promise.all([
            api('GET', '/chamados/' + id),
            api('GET', `/chamados/${id}/comentarios`),
            api('GET', '/tecnicos')
        ]);
        const fechado = c.status === 'FECHADO';
        const status = ['ABERTO', 'EM_ATENDIMENTO', 'AGUARDANDO_CLIENTE', 'FECHADO'];

        document.getElementById('detalheChamado').innerHTML = `
            <h3>Chamado #${c.id} - ${esc(c.titulo)}</h3>
            <div class="info">
                <b>Descrição</b><span>${esc(c.descricao)}</span>
                <b>Cliente</b><span>${esc(c.clienteNome)}</span>
                <b>Categoria</b><span>${esc(c.categoriaNome)}</span>
                <b>Técnico</b><span>${esc(c.tecnicoNome) || '<i>sem técnico</i>'}</span>
                <b>Prioridade</b><span>${badge(c.prioridade)}</span>
                <b>Status</b><span>${badge(c.status)}</span>
                <b>Abertura</b><span>${formatarData(c.dataAbertura)}</span>
                <b>Fechamento</b><span>${formatarData(c.dataFechamento)}</span>
            </div>

            <div class="bloco">
                <h4>Atendimento</h4>
                <div class="linha">
                    <select id="novoTecnico" ${fechado ? 'disabled' : ''}>
                        <option value="">Selecione o técnico...</option>
                        ${tecnicos.map(t => `<option value="${t.id}" ${t.id === c.tecnicoId ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}
                    </select>
                    <button onclick="atribuir(${c.id})" ${fechado ? 'disabled' : ''}>Atribuir técnico</button>
                </div>
                <div class="linha" style="margin-top:8px">
                    <select id="novoStatus" ${fechado ? 'disabled' : ''}>
                        ${status.map(s => `<option ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                    <button onclick="alterarStatus(${c.id})" ${fechado ? 'disabled' : ''}>Alterar status</button>
                </div>
                ${fechado ? '<p class="erros">Chamado fechado não pode ser alterado.</p>' : ''}
            </div>

            <div class="bloco">
                <h4>Comentários (${comentarios.length})</h4>
                ${comentarios.map(m => `
                    <div class="comentario">
                        <small><b>${esc(m.autor)}</b> em ${formatarData(m.data)}</small>
                        <div>${esc(m.texto)}</div>
                    </div>`).join('') || '<p><i>Nenhum comentário</i></p>'}
                <div class="campo"><input id="comentarioAutor" placeholder="Autor"></div>
                <div class="campo"><textarea id="comentarioTexto" placeholder="Escreva um comentário..."></textarea></div>
                <button onclick="comentar(${c.id})">Adicionar comentário</button>
            </div>

            <div class="acoes">
                <button class="perigo" onclick="excluirChamado(${c.id})">Excluir</button>
                <button onclick="abrirFormChamado(${c.id})" ${fechado ? 'disabled' : ''}>Editar</button>
                <button onclick="fecharModal('modalChamado')">Fechar</button>
            </div>`;

        const modal = document.getElementById('modalChamado');
        if (!modal.open) modal.showModal();
    } catch (e) {
        aviso(mensagemErro(e), 'erro');
    }
}

async function acaoChamado(id, promessa, mensagem) {
    try {
        await promessa;
        aviso(mensagem);
        atualizarTelaChamados();
        abrirChamado(id);
    } catch (e) {
        aviso(mensagemErro(e), 'erro');
    }
}

function atribuir(id) {
    const tecnicoId = document.getElementById('novoTecnico').value || null;
    acaoChamado(id, api('PATCH', `/chamados/${id}/atribuir`, { tecnicoId }), 'Técnico atribuído');
}

function alterarStatus(id) {
    const status = document.getElementById('novoStatus').value;
    acaoChamado(id, api('PATCH', `/chamados/${id}/status`, { status }), 'Status alterado');
}

function comentar(id) {
    const autor = document.getElementById('comentarioAutor').value;
    const texto = document.getElementById('comentarioTexto').value;
    acaoChamado(id, api('POST', `/chamados/${id}/comentarios`, { autor, texto }), 'Comentário adicionado');
}

async function excluirChamado(id) {
    if (!confirm('Deseja realmente excluir o chamado #' + id + '?')) return;
    try {
        await api('DELETE', '/chamados/' + id);
        fecharModal('modalChamado');
        aviso('Chamado excluído');
        atualizarTelaChamados();
    } catch (e) {
        aviso(mensagemErro(e), 'erro');
    }
}

// ===================== Inicio =====================

carregarFiltroClientes();
carregarInicio();
document.querySelector('[data-aba="chamados"]').addEventListener('click', carregarFiltroClientes);
