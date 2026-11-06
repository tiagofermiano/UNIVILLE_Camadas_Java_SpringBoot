# UNIVILLE_Camadas_Java_SpringBoot

## Consultas de chamados (filtros, paginação e ordenação)

Todos os filtros são opcionais e podem ser combinados.
Padrão: 10 itens por página, ordenados por `dataAbertura` decrescente.

| Exemplo | O que retorna |
|---|---|
| `GET /chamados` | Todos os chamados (página 0) |
| `GET /chamados?status=ABERTO` | Chamados abertos |
| `GET /chamados?prioridade=ALTA` | Chamados de prioridade alta |
| `GET /chamados?clienteId=1` | Chamados do cliente 1 |
| `GET /chamados?status=ABERTO&prioridade=ALTA&clienteId=1` | Combinação dos três filtros |
| `GET /chamados?page=1&size=5` | Segunda página, 5 itens por página |
| `GET /chamados?sort=titulo,asc` | Ordenado por título (A-Z) |
| `GET /chamados?status=EM_ATENDIMENTO&sort=dataAbertura,asc` | Filtro + ordenação |
| `GET /clientes/1/chamados` | Chamados do cliente 1 (404 se o cliente não existir) |

Valores aceitos:
- `status`: `ABERTO`, `EM_ATENDIMENTO`, `AGUARDANDO_CLIENTE`, `FECHADO`
- `prioridade`: `BAIXA`, `MEDIA`, `ALTA`, `CRITICA`

Exemplo de resposta paginada:

```json
{
  "content": [ { "id": 3, "titulo": "PC não liga", "status": "ABERTO", "prioridade": "ALTA" } ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

Teste pelo terminal:

```bash
curl -i "http://localhost:8080/chamados?status=ABERTO&prioridade=ALTA&page=0&size=5"
curl -i http://localhost:8080/clientes/1/chamados
```
