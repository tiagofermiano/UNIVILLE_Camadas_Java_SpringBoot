package br.com.sistemas.chamados.repository;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import br.com.sistemas.chamados.entity.Categoria;
import br.com.sistemas.chamados.entity.Chamado;
import br.com.sistemas.chamados.entity.Cliente;
import br.com.sistemas.chamados.entity.Prioridade;
import br.com.sistemas.chamados.entity.StatusChamado;

@DataJpaTest
class ChamadoRepositoryTest {

    @Autowired
    private ChamadoRepository repository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private CategoriaRepository categoriaRepository;

    private Cliente ana;
    private Cliente bruno;
    private final Pageable pagina = PageRequest.of(0, 10);

    @BeforeEach
    void setUp() {
        ana = clienteRepository.save(new Cliente("Ana", "ana@exemplo.com", "479"));
        bruno = clienteRepository.save(new Cliente("Bruno", "bruno@exemplo.com", "479"));
        Categoria hardware = categoriaRepository.save(new Categoria("Hardware", "Equipamentos"));

        repository.save(new Chamado("PC não liga", "d", Prioridade.ALTA, ana, hardware, null));
        repository.save(new Chamado("Impressora", "d", Prioridade.BAIXA, ana, hardware, null));
        Chamado fechado = new Chamado("Monitor", "d", Prioridade.ALTA, bruno, hardware, null);
        fechado.setStatus(StatusChamado.FECHADO);
        repository.save(fechado);
    }

    @Test
    void novoChamadoDeveNascerAbertoComDataAbertura() {
        Chamado chamado = repository.findByClienteId(bruno.getId(), pagina).getContent().get(0);
        Chamado novo = repository.findAll().stream()
            .filter(c -> c.getTitulo().equals("PC não liga")).findFirst().orElseThrow();

        assertThat(novo.getStatus()).isEqualTo(StatusChamado.ABERTO);
        assertThat(novo.getDataAbertura()).isNotNull();
        assertThat(chamado.getStatus()).isEqualTo(StatusChamado.FECHADO);
    }

    @Test
    void filtrarSemParametrosDeveRetornarTodos() {
        Page<Chamado> resultado = repository.filtrar(null, null, null, pagina);

        assertThat(resultado.getTotalElements()).isEqualTo(3);
    }

    @Test
    void filtrarPorStatus() {
        Page<Chamado> resultado = repository.filtrar(StatusChamado.ABERTO, null, null, pagina);

        assertThat(resultado.getTotalElements()).isEqualTo(2);
    }

    @Test
    void filtrarPorPrioridade() {
        Page<Chamado> resultado = repository.filtrar(null, Prioridade.ALTA, null, pagina);

        assertThat(resultado.getTotalElements()).isEqualTo(2);
    }

    @Test
    void filtrarCombinandoStatusPrioridadeECliente() {
        Page<Chamado> resultado = repository.filtrar(
            StatusChamado.ABERTO, Prioridade.ALTA, ana.getId(), pagina);

        assertThat(resultado.getTotalElements()).isEqualTo(1);
        assertThat(resultado.getContent().get(0).getTitulo()).isEqualTo("PC não liga");
    }

    @Test
    void findByClienteIdDeveRetornarSomenteChamadosDoCliente() {
        Page<Chamado> resultado = repository.findByClienteId(ana.getId(), pagina);

        assertThat(resultado.getTotalElements()).isEqualTo(2);
        assertThat(resultado.getContent())
            .allMatch(c -> c.getCliente().getId().equals(ana.getId()));
    }

    @Test
    void paginacaoDeveRespeitarTamanhoDaPagina() {
        Page<Chamado> resultado = repository.filtrar(null, null, null, PageRequest.of(0, 2));

        assertThat(resultado.getContent()).hasSize(2);
        assertThat(resultado.getTotalPages()).isEqualTo(2);
    }
}
