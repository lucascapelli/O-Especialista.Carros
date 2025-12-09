// static/core/front-end/js/avaliacoes_combinado.js

document.addEventListener('DOMContentLoaded', function() {
    // Inicializar o gerenciador de avaliações
    const avaliacoesSection = document.getElementById('avaliacoes');
    if (avaliacoesSection) {
        const produtoId = avaliacoesSection.dataset.produtoId;
        window.avaliacoesManager = new AvaliacoesManager();
        window.avaliacoesManager.init(produtoId);
    }

    // Inicializar o formulário inline
    initAvaliacaoForm();
});

// ==============================================
// GERENCIADOR DE AVALIAÇÕES (LISTA, FILTROS, etc.)
// ==============================================

class AvaliacoesManager {
    constructor() {
        this.produtoId = null;
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoading = false;
        this.currentFilters = {
            nota: null,
            com_midia: false,
            ordenar: 'recente'
        };
    }

    init(produtoId) {
        this.produtoId = produtoId;
        this.bindEvents();
        
        // Adicionar data-produto-id à seção
        const avaliacoesSection = document.getElementById('avaliacoes');
        if (avaliacoesSection) {
            avaliacoesSection.dataset.produtoId = produtoId;
        }
    }

    bindEvents() {
        // Carregar mais avaliações
        const loadMoreBtn = document.getElementById('carregar-mais-avaliacoes');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.carregarMaisAvaliacoes());
        }

        // Filtros
        document.querySelectorAll('.filtro-nota').forEach(btn => {
            btn.addEventListener('click', (e) => this.filtrarPorNota(e));
        });

        document.querySelector('.filtro-midia')?.addEventListener('click', () => this.filtrarComMidia());
        document.querySelector('.filtro-ordenar')?.addEventListener('change', (e) => this.ordenarAvaliacoes(e));
    }

    async carregarMaisAvaliacoes() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        const loadingEl = document.getElementById('loading-avaliacoes');
        const loadMoreBtn = document.getElementById('carregar-mais-avaliacoes');

        if (loadingEl) loadingEl.classList.remove('hidden');
        if (loadMoreBtn) loadMoreBtn.disabled = true;

        try {
            const offset = parseInt(loadMoreBtn.dataset.offset);
            const response = await fetch(`/api/avaliacoes/${this.produtoId}/listar/?offset=${offset}`);
            const data = await response.json();

            if (data.success && data.avaliacoes && data.avaliacoes.length > 0) {
                const container = document.getElementById('avaliacoes-container');
                
                // Renderizar novas avaliações
                data.avaliacoes.forEach(avaliacao => {
                    const html = this.renderAvaliacao(avaliacao);
                    container.insertAdjacentHTML('beforeend', html);
                });

                // Atualizar offset
                loadMoreBtn.dataset.offset = offset + data.avaliacoes.length;
                
                // Verificar se ainda há mais avaliações
                if (data.avaliacoes.length < 5) {
                    this.hasMore = false;
                    loadMoreBtn.style.display = 'none';
                }
            } else {
                this.hasMore = false;
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            }

        } catch (error) {
            console.error('Erro ao carregar avaliações:', error);
            this.showToast('Erro ao carregar mais avaliações', 'error');
        } finally {
            this.isLoading = false;
            if (loadingEl) loadingEl.classList.add('hidden');
            if (loadMoreBtn) loadMoreBtn.disabled = false;
        }
    }

    async filtrarPorNota(event) {
        const nota = event.target.dataset.nota;
        
        // Toggle do filtro
        if (this.currentFilters.nota === nota) {
            this.currentFilters.nota = null;
            event.target.classList.remove('bg-blue-50', 'border-blue-300', 'text-blue-700');
            event.target.classList.add('border-gray-300', 'text-gray-700');
        } else {
            // Remove classe ativa de outros botões
            document.querySelectorAll('.filtro-nota').forEach(btn => {
                btn.classList.remove('bg-blue-50', 'border-blue-300', 'text-blue-700');
                btn.classList.add('border-gray-300', 'text-gray-700');
            });
            
            // Ativa o botão clicado
            event.target.classList.add('bg-blue-50', 'border-blue-300', 'text-blue-700');
            event.target.classList.remove('border-gray-300', 'text-gray-700');
            
            this.currentFilters.nota = nota;
        }

        await this.reloadAvaliacoes();
    }

    async filtrarComMidia() {
        const btn = document.querySelector('.filtro-midia');
        this.currentFilters.com_midia = !this.currentFilters.com_midia;
        
        if (this.currentFilters.com_midia) {
            btn.classList.add('bg-blue-50', 'border-blue-300', 'text-blue-700');
        } else {
            btn.classList.remove('bg-blue-50', 'border-blue-300', 'text-blue-700');
        }

        await this.reloadAvaliacoes();
    }

    async ordenarAvaliacoes(event) {
        this.currentFilters.ordenar = event.target.value;
        await this.reloadAvaliacoes();
    }

    async reloadAvaliacoes() {
        this.currentPage = 1;
        this.isLoading = true;

        const container = document.getElementById('avaliacoes-container');
        const loadMoreBtn = document.getElementById('carregar-mais-avaliacoes');
        
        if (!container) return;

        container.innerHTML = '<div class="text-center py-8"><div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>';

        try {
            // Construir query string com filtros
            const params = new URLSearchParams({
                page: this.currentPage,
                nota: this.currentFilters.nota || '',
                com_midia: this.currentFilters.com_midia,
                ordenar: this.currentFilters.ordenar
            });

            const response = await fetch(`/api/avaliacoes/${this.produtoId}/listar/?${params}`);
            const data = await response.json();

            container.innerHTML = '';

            if (data.success && data.avaliacoes && data.avaliacoes.length > 0) {
                data.avaliacoes.forEach(avaliacao => {
                    const html = this.renderAvaliacao(avaliacao);
                    container.insertAdjacentHTML('beforeend', html);
                });
                
                // Atualizar estatísticas se vierem na resposta
                if (data.estatisticas) {
                    this.atualizarEstatisticas(data.estatisticas);
                }
                
                // Resetar botão de carregar mais
                if (loadMoreBtn) {
                    loadMoreBtn.dataset.offset = data.avaliacoes.length;
                    loadMoreBtn.style.display = data.has_more ? 'block' : 'none';
                    this.hasMore = data.has_more;
                }
            } else {
                container.innerHTML = `
                    <div class="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <i class="fas fa-comments text-5xl text-gray-300 mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">Nenhuma avaliação encontrada</h3>
                        <p class="text-gray-600 mb-4">Tente ajustar os filtros.</p>
                    </div>
                `;
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            }

        } catch (error) {
            console.error('Erro ao carregar avaliações:', error);
            container.innerHTML = `
                <div class="text-center py-12 text-red-600">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Erro ao carregar avaliações. Tente novamente.</p>
                </div>
            `;
        } finally {
            this.isLoading = false;
        }
    }

    atualizarEstatisticas(estatisticas) {
        // Atualizar média geral
        const mediaElement = document.querySelector('.text-3xl.font-bold.text-gray-900');
        if (mediaElement && estatisticas.media) {
            mediaElement.textContent = estatisticas.media.toFixed(1);
        }
        
        // Atualizar total de avaliações
        const totalElement = document.querySelector('.text-sm.text-gray-500.mt-2');
        if (totalElement && estatisticas.total) {
            totalElement.textContent = `${estatisticas.total} avaliações`;
        }
        
        // Atualizar percentual de recomendação
        const recomendacaoElement = document.querySelector('.text-2xl.font-bold.text-green-600');
        if (recomendacaoElement && estatisticas.recomendacao_percent) {
            recomendacaoElement.textContent = `${estatisticas.recomendacao_percent}%`;
        }
    }

    renderAvaliacao(avaliacao) {
        return `
            <div class="avaliacao-item bg-white rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-shadow duration-300">
                <div class="flex items-start justify-between">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                            ${avaliacao.usuario_iniciais || '??'}
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-900">${avaliacao.usuario_nome || 'Usuário'}</h4>
                            <div class="flex items-center text-gray-600 text-sm">
                                <div class="flex text-yellow-400 mr-2">
                                    ${this.renderStars(avaliacao.nota_geral || 0)}
                                </div>
                                <span>• ${avaliacao.tempo_decorrido || 'Recentemente'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="relative">
                        <button class="text-gray-400 hover:text-gray-600 p-1">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                    </div>
                </div>
                
                <h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">${avaliacao.titulo || ''}</h3>
                
                <div class="text-gray-700 mb-4 leading-relaxed">${avaliacao.comentario || ''}</div>
                
                ${avaliacao.melhor_ponto ? `
                <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <div class="flex items-start">
                        <i class="fas fa-thumbs-up text-green-500 mt-1 mr-2"></i>
                        <div>
                            <div class="font-medium text-green-800">O que mais gostei:</div>
                            <div class="text-green-700">${avaliacao.melhor_ponto}</div>
                        </div>
                    </div>
                </div>` : ''}
                
                ${avaliacao.pior_ponto ? `
                <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <div class="flex items-start">
                        <i class="fas fa-thumbs-down text-red-500 mt-1 mr-2"></i>
                        <div>
                            <div class="font-medium text-red-800">O que poderia melhorar:</div>
                            <div class="text-red-700">${avaliacao.pior_ponto}</div>
                        </div>
                    </div>
                </div>` : ''}
                
                ${avaliacao.tempo_de_uso ? `
                <div class="text-gray-600 text-sm mb-3">
                    <i class="far fa-clock mr-1"></i>
                    Tempo de uso: ${avaliacao.tempo_de_uso}
                </div>` : ''}
                
                ${avaliacao.recomendaria ? `
                <div class="inline-flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm mb-3">
                    <i class="fas fa-check mr-1"></i>
                    Recomenda este produto
                </div>` : ''}
                
                <!-- Mídias -->
                ${avaliacao.midias && avaliacao.midias.length > 0 ? `
                <div class="mt-4">
                    <div class="grid grid-cols-3 gap-2">
                        ${avaliacao.midias.map(midia => `
                            <div class="relative group cursor-pointer" onclick="openImagePreview('${midia.arquivo}')">
                                ${midia.tipo === 'imagem' ? 
                                    `<img src="${midia.thumbnail || midia.arquivo}" alt="Foto avaliação" class="w-full h-24 object-cover rounded-lg group-hover:opacity-90 transition">` :
                                    `<div class="relative">
                                        <video class="w-full h-24 object-cover rounded-lg">
                                            <source src="${midia.arquivo}" type="video/mp4">
                                        </video>
                                        <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                            <i class="fas fa-play text-white text-lg"></i>
                                        </div>
                                    </div>`
                                }
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}
            </div>
        `;
    }

    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i - 0.5 <= rating) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        return stars;
    }

    showToast(message, type = 'info') {
        // Implementação básica de toast
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
            type === 'error' ? 'bg-red-500 text-white' : 
            type === 'success' ? 'bg-green-500 text-white' : 
            'bg-blue-500 text-white'
        }`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// ==============================================
// FORMULÁRIO INLINE DE AVALIAÇÃO
// ==============================================

function initAvaliacaoForm() {
    // Elementos do formulário inline
    const toggleAvaliacaoFormBtn = document.getElementById('toggle-avaliacao-form');
    const toggleAvaliacaoFormEmptyBtn = document.getElementById('toggle-avaliacao-form-empty');
    const avaliacaoFormContainer = document.getElementById('avaliacao-form-container');
    const closeAvaliacaoFormBtn = document.getElementById('close-avaliacao-form');
    const cancelAvaliacaoFormBtn = document.getElementById('cancel-avaliacao-form');
    const avaliacaoForm = document.getElementById('avaliacao-form');

    // Se não existir o formulário, não inicializar
    if (!avaliacaoFormContainer) return;

    // Função para mostrar o formulário
    function showAvaliacaoForm() {
        avaliacaoFormContainer.classList.remove('hidden');
        avaliacaoFormContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Função para esconder o formulário
    function hideAvaliacaoForm() {
        avaliacaoFormContainer.classList.add('hidden');
    }

    // Event listeners para mostrar o formulário
    if (toggleAvaliacaoFormBtn) {
        toggleAvaliacaoFormBtn.addEventListener('click', showAvaliacaoForm);
    }
    
    if (toggleAvaliacaoFormEmptyBtn) {
        toggleAvaliacaoFormEmptyBtn.addEventListener('click', showAvaliacaoForm);
    }

    // Event listeners para esconder o formulário
    if (closeAvaliacaoFormBtn) {
        closeAvaliacaoFormBtn.addEventListener('click', hideAvaliacaoForm);
    }
    
    if (cancelAvaliacaoFormBtn) {
        cancelAvaliacaoFormBtn.addEventListener('click', hideAvaliacaoForm);
    }

    // Sistema de estrelas
    const starButtons = document.querySelectorAll('.star-rating-btn');
    const notaInput = document.getElementById('id_nota_geral');
    
    starButtons.forEach(button => {
        button.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            notaInput.value = rating;
            
            starButtons.forEach((btn, index) => {
                const star = btn.querySelector('i');
                if (index < rating) {
                    star.className = 'fas fa-star text-yellow-400';
                } else {
                    star.className = 'far fa-star text-gray-300';
                }
            });
        });
    });

    // Estrelas específicas
    const specificButtons = document.querySelectorAll('.specific-rating-btn');
    specificButtons.forEach(button => {
        button.addEventListener('click', function() {
            const type = this.dataset.type;
            const rating = parseInt(this.dataset.rating);
            const input = document.getElementById(`id_nota_${type}`);
            input.value = rating;
            
            // Atualiza apenas as estrelas deste grupo
            const groupButtons = document.querySelectorAll(`.specific-rating-btn[data-type="${type}"]`);
            groupButtons.forEach((btn, index) => {
                const star = btn.querySelector('i');
                if (index < rating) {
                    star.className = 'fas fa-star text-blue-400';
                } else {
                    star.className = 'far fa-star text-gray-300';
                }
            });
        });
    });

    // Contador de caracteres
    const textarea = document.getElementById('id_comentario');
    const charCount = document.getElementById('char-count');
    
    if (textarea && charCount) {
        textarea.addEventListener('input', function() {
            charCount.textContent = this.value.length;
        });
    }

    // Upload de arquivos
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('id_midias');
    const filePreview = document.getElementById('file-preview');
    
    if (uploadArea && fileInput && filePreview) {
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.parentElement.classList.add('border-blue-500', 'bg-blue-50');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.parentElement.classList.remove('border-blue-500', 'bg-blue-50');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.parentElement.classList.remove('border-blue-500', 'bg-blue-50');
            fileInput.files = e.dataTransfer.files;
            handleFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });
        
        function handleFiles(files) {
            filePreview.innerHTML = '';
            
            Array.from(files).slice(0, 5).forEach(file => {
                if (file.size > 10 * 1024 * 1024) {
                    alert(`Arquivo ${file.name} excede 10MB`);
                    return;
                }
                
                const reader = new FileReader();
                const previewDiv = document.createElement('div');
                previewDiv.className = 'relative group';
                
                reader.onload = function(e) {
                    if (file.type.startsWith('image/')) {
                        previewDiv.innerHTML = `
                            <img src="${e.target.result}" alt="${file.name}" 
                                 class="w-full h-24 object-cover rounded-lg cursor-pointer"
                                 onclick="openImagePreview('${e.target.result}')">
                            <button type="button" onclick="removeFile(this)" 
                                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">
                                ×
                            </button>
                            <div class="text-xs text-gray-600 truncate mt-1">${file.name}</div>
                        `;
                    } else if (file.type.startsWith('video/')) {
                        previewDiv.innerHTML = `
                            <div class="relative">
                                <video class="w-full h-24 object-cover rounded-lg">
                                    <source src="${e.target.result}" type="${file.type}">
                                </video>
                                <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                    <i class="fas fa-play text-white"></i>
                                </div>
                            </div>
                            <button type="button" onclick="removeFile(this)" 
                                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">
                                ×
                            </button>
                            <div class="text-xs text-gray-600 truncate mt-1">${file.name}</div>
                        `;
                    }
                };
                
                reader.readAsDataURL(file);
                filePreview.appendChild(previewDiv);
            });
        }
    }

    // Envio do formulário via AJAX
    if (avaliacaoForm) {
        avaliacaoForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const loadingElement = document.getElementById('form-loading');
            const successElement = document.getElementById('form-success');
            const errorElement = document.getElementById('form-error');
            
            // Mostrar loading
            loadingElement.classList.remove('hidden');
            successElement.classList.add('hidden');
            errorElement.classList.add('hidden');
            
            // Enviar via AJAX
            fetch(`/avaliacao/criar/${avaliacaoForm.querySelector('[name="produto_id"]').value}/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                loadingElement.classList.add('hidden');
                
                if (data.success) {
                    successElement.classList.remove('hidden');
                    
                    // Limpar formulário
                    avaliacaoForm.reset();
                    
                    // Resetar estrelas
                    starButtons.forEach(btn => {
                        const star = btn.querySelector('i');
                        star.className = 'far fa-star text-gray-300';
                    });
                    if (notaInput) notaInput.value = '5';
                    
                    // Resetar estrelas específicas
                    specificButtons.forEach(btn => {
                        const star = btn.querySelector('i');
                        star.className = 'far fa-star text-gray-300';
                    });
                    const qualidadeInput = document.getElementById('id_nota_qualidade');
                    const custoInput = document.getElementById('id_nota_custo_beneficio');
                    if (qualidadeInput) qualidadeInput.value = '';
                    if (custoInput) custoInput.value = '';
                    
                    // Limpar preview de arquivos
                    if (filePreview) filePreview.innerHTML = '';
                    
                    // Atualizar contador de caracteres
                    if (charCount) charCount.textContent = '0';
                    
                    // Fechar formulário após 3 segundos e recarregar avaliações
                    setTimeout(() => {
                        hideAvaliacaoForm();
                        // Recarregar avaliações se o gerenciador estiver disponível
                        if (window.avaliacoesManager) {
                            window.avaliacoesManager.reloadAvaliacoes();
                        }
                    }, 3000);
                } else {
                    errorElement.classList.remove('hidden');
                    const errorMessage = document.getElementById('error-message');
                    errorMessage.textContent = data.message || 'Erro ao enviar avaliação';
                }
            })
            .catch(error => {
                loadingElement.classList.add('hidden');
                errorElement.classList.remove('hidden');
                const errorMessage = document.getElementById('error-message');
                errorMessage.textContent = 'Erro de conexão. Tente novamente.';
                console.error('Error:', error);
            });
        });
    }
}

// ==============================================
// FUNÇÕES GLOBAIS
// ==============================================

// Funções globais para preview de imagens
function openImagePreview(src) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <button onclick="closeImagePreview()" class="absolute top-4 right-4 text-white text-3xl hover:text-gray-300">&times;</button>
        <div class="max-w-4xl max-h-full">
            <img src="${src}" class="max-w-full max-h-full object-contain">
        </div>
    `;
    document.body.appendChild(modal);
}

function closeImagePreview() {
    const modal = document.querySelector('.fixed.inset-0.bg-black');
    if (modal) modal.remove();
}

function removeFile(button) {
    button.closest('.relative').remove();
}