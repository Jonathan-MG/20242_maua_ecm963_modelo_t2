const Redux = require('redux')
const prompts = require('prompts')

const criarContrato = (nome, taxa, data) => {
  return {
    type: "CRIAR_CONTRATO",
    payload: {
      nome, taxa, data
    }
  }
}

const cancelarContrato = (nome, data) => {
  let multa = 0
  let dataContrato = store.getState().contratos.find(c => c.nome === nome).data
  let dataCancelamento = data
  let diferenca = (dataCancelamento - dataContrato) / 1000 / 60 / 60 / 24 / 30
  if (diferenca < 3) {
    multa = 100
  }
  return {
    type: 'CANCELAR_CONTRATO',
    payload: {
      nome, dataCancelamento, multa
    }
  }
}

const solicitarCashback = (nome, valor) => {
  let saldo = consultarSaldoCashback(nome)
  let statusCashback = 'NAO_ATENDIDO'
  if (saldo >= valor) {
    statusCashback = 'ATENDIDO'
  }
  return {
    type: "CASHBACK",
    payload: { nome, valor, statusCashback }
  }
}

const consultarSaldoCashback = (nome) => {
  let saldoCashbackTotal = 0
  let saldoCashbackSolicitados = 0
  let saldoDisponivel = 0
  let historicoDeComprasDoCliente = store.getState().historicoDeCompras.filter(c => c.nome === nome)
  if (historicoDeComprasDoCliente.length > 0) {
    let valorTotal = historicoDeComprasDoCliente.map((compra) => compra.cashback)
    saldoCashbackTotal = valorTotal.reduce((a, b) => a + b)
  }
  let historicoDeCashbackDoCliente = store.getState().historicoDePedidosDeCashback.filter(c => (c.nome === nome) && (c.statusCashback === 'ATENDIDO'))
  if (historicoDeCashbackDoCliente.length > 0) {
    let valorCashback = historicoDeCashbackDoCliente.map((cashback) => cashback.valor)
    saldoCashbackSolicitados = valorCashback.reduce((a, b) => a + b)
  }
  saldoDisponivel = saldoCashbackTotal - saldoCashbackSolicitados
  return saldoDisponivel
}

const comprarProduto = (nome, nomeProduto, valorProduto) => {
  let cashback = valorProduto * 0.1
  return {
    type: "COMPRAR_PRODUTO",
    payload: { nome, nomeProduto, valorProduto, cashback }
  }
}

const historicoDePedidosDeCashback = (historicoDePedidosDeCashbackAtual = [], acao) => {
  if (acao.type === "CASHBACK") {
    return [
      ...historicoDePedidosDeCashbackAtual,
      acao.payload
    ]
  }
  return historicoDePedidosDeCashbackAtual
}

const historicoDeCompras = (historicoDeComprasAtual = [], acao) => {
  if (acao.type === "COMPRAR_PRODUTO") {
    return [
      ...historicoDeComprasAtual,
      acao.payload
    ]
  }
  return historicoDeComprasAtual
}

const caixa = (dinheiroEmCaixa = 0, acao) => {
  if (acao.type === "CASHBACK") {
    if (acao.payload.statusCashback === 'ATENDIDO') {
      dinheiroEmCaixa -= acao.payload.valor
    }
  }
  else if (acao.type === "CRIAR_CONTRATO") {
    dinheiroEmCaixa += acao.payload.taxa
  }
  else if (acao.type === "CANCELAR_CONTRATO") {
    dinheiroEmCaixa += acao.payload.multa
  }
  return dinheiroEmCaixa
}

const contratos = (listaDeContratosAtual = [], acao) => {
  if (acao.type === "CRIAR_CONTRATO")
    return [...listaDeContratosAtual, acao.payload]
  if (acao.type === "CANCELAR_CONTRATO")
    return listaDeContratosAtual.filter(c => c.nome !== acao.payload.nome)
  return listaDeContratosAtual
}

const { createStore, combineReducers } = Redux

const todosOsReducers = combineReducers({
  historicoDePedidosDeCashback, caixa, contratos, historicoDeCompras
})

const store = createStore(todosOsReducers)

const menu = async () => {
  let continuar = true
  while (continuar) {
    const resposta = await prompts({
      type: 'number',
      name: 'opcao',
      message: `
        Escolha uma opção:
        1. Realizar novo contrato
        2. Cancelar contrato existente
        3. Realizar a compra de um produto
        4. Consultar saldo de cashback
        5. Fazer pedido de cashback
        6. Exibir saldo em caixa
        0. Sair
      `
    })

    switch (resposta.opcao) {
      case 1:
        const contrato = await prompts([
          { type: 'text', name: 'nome', message: 'Nome do cliente:' },
          { type: 'number', name: 'taxa', message: 'Taxa do contrato:' },
          {
            type: 'date',
            name: 'data',
            message: 'Escolha uma data:',
            mask: 'YYYY-MM-DD',
            initial: new Date(2000, 0, 1),
            validate: date => date > Date.now() ? 'Data inválida' : true
          }
        ])
        store.dispatch(criarContrato(contrato.nome, contrato.taxa, contrato.data))
        break

      case 2:
        const nomeCancelamento = await prompts([
          { type: 'text', name: 'nome', message: 'Nome do cliente para cancelar o contrato:' },
          {
            type: 'date',
            name: 'dataCancelamento',
            message: 'Escolha uma data:',
            mask: 'YYYY-MM-DD',
            initial: new Date(2000, 0, 1),
            validate: date => date > Date.now() ? 'Data inválida' : true
          }
        ])
        store.dispatch(cancelarContrato(nomeCancelamento.nome, nomeCancelamento.dataCancelamento))
        break

      case 3:
        const compraProduto = await prompts([
          { type: 'text', name: 'nome', message: 'Nome do cliente realizando a compra:' },
          { type: 'text', name: 'nomeProduto', message: 'Nome do produto sendo comprado:' },
          { type: 'number', name: 'valor', message: 'Valor do produto:' }
        ])
        store.dispatch(comprarProduto(compraProduto.nome, compraProduto.nomeProduto, compraProduto.valor))
        break

      case 4:
        const consulta = await prompts({ type: 'text', name: 'nome', message: 'Nome do cliente para consulta de cashback:' })
        console.log(`Saldo de cashback: R$${consultarSaldoCashback(consulta.nome)}`)
        break

      case 5:
        const pedidoCashback = await prompts([
          { type: 'text', name: 'nome', message: 'Nome do cliente para pedido de cashback:' },
          { type: 'number', name: 'valor', message: 'Valor do cashback:' }
        ])
        store.dispatch(solicitarCashback(pedidoCashback.nome, pedidoCashback.valor))
        console.log(`Status da solicitação: ${store.getState().historicoDePedidosDeCashback.find(c => (c.nome === pedidoCashback.nome) && (c.valor === pedidoCashback.valor)).statusCashback}`)
        break

      case 6:
        console.log(`Saldo em caixa: R$${store.getState().caixa}`)
        break

      case 0:
        continuar = false
        break

      default:
        console.log('Opção inválida, tente novamente.')
    }
  }
}

menu()