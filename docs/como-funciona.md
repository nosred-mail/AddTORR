# Como o AddTORR processa os streams

Esta documentação detalha o fluxo exato de como o AddTORR processa os links (streams) no momento, desde a busca nos agregadores até a entrega do resultado final para o Stremio. O processo é dividido em etapas sequenciais.

---

## 1. Busca nas Fontes (Agregadores)
**Função:** `fetchSource` e `aggregateStreams` (Início)
*   O AddTORR recebe a requisição do Stremio (ex: filme X).
*   Ele lê a lista de URLs de "Fontes" configuradas pelo usuário.
*   Ele faz uma requisição simultânea (em paralelo) para todas essas fontes buscando os links disponíveis para aquele filme/série.
*   Se uma fonte demorar mais de 8 segundos para responder, ela é ignorada (timeout).
*   Só são aceitas fontes em `https` e em endereços públicos, com no máximo 10 fontes por configuração.
*   Todos os links retornados por todas as fontes são juntados em uma única grande lista bruta (`rawStreams`).

---

## 2. Leitura e Interpretação dos Links (Parsing)
**Função:** `parse`
*   Para cada link bruto, o AddTORR analisa o título e a descrição originais para extrair informações importantes:
    *   **Resolução:** 4K, 1080p, 720p, etc. (Ganha uma pontuação de "Rank").
    *   **Qualidade/Encode:** Remux, BluRay, WEB-DL, CAM, etc. (Ganha uma pontuação de "Rank").
    *   **HDR:** DV, HDR10+, HDR, etc.
    *   **Codec:** AV1, x265, x264.
    *   **Áudio e Canais:** Atmos, TrueHD, 5.1, 7.1, etc.
    *   **Idiomas:** Procura por tags como "PT-BR", "Dublado", "Latino", "Multi", etc.
    *   **Outros:** Se é 3D, tamanho do arquivo (em GB/MB), quantidade de *seeds* (semeadores).
*   Ele também tenta "limpar" o título do torrent para remover tags e deixar apenas o nome do filme/série limpo.
*   **Cálculo de Pontuação Base (`rankScore`):** Cada link recebe uma pontuação matemática baseada na Resolução + Qualidade + HDR + Codec + Seeds. Isso serve para desempates futuros.

---

## 3. Deduplicação (Remoção de Repetidos)
**Função:** `deduplicateByInfoHash`
*   Como o AddTORR busca em várias fontes, é comum que o *mesmo* arquivo torrent seja retornado por mais de uma fonte.
*   Ele verifica o `infoHash` (a identidade única do torrent).
*   Se encontrar hashes repetidos, ele mantém apenas um. A regra de escolha é: **mantém o link que reportar o maior número de *seeds***.

---

## 4. Verificação de Cache no Debrid (Opcional)
**Função:** `checkDebridCache`
*   Se o usuário configurou um serviço de Debrid (Real-Debrid, AllDebrid, TorBox) e inseriu a API Key:
*   O AddTORR pega todos os `infoHashes` da lista e pergunta ao serviço de Debrid: *"Quais desses arquivos você já tem baixados no seu servidor (em cache)?"*
*   Os links que o Debrid confirmar que tem em cache recebem uma marcação interna (`isCached = true`).

---

## 5. Aplicação de Filtros (Descarte)
**Função:** `applyFilters`
*   Esta etapa joga fora os links que não servem, baseando-se nas configurações do usuário:
    *   **Somente em Cache:** Se ativado, descarta qualquer link que não tenha a marcação `isCached = true`.
    *   **Excluir 3D:** Descarta links marcados como 3D, SBS, etc.
    *   **Tamanho Máximo:** Descarta links maiores que o limite em GB definido.
    *   **Seeds Mínimos:** Descarta links com menos seeds que o exigido.
    *   **Resoluções:** Se o usuário marcou apenas "4K" e "1080p", descarta 720p, 480p, etc.
    *   **Modo Estrito de Idioma:** Se ativado, descarta qualquer link que não contenha os idiomas preferidos do usuário (ou que não seja "Multi").
*   A lista que sobra após essa etapa é chamada de **`normalStreams`** (links normais).

---

## 6. Ordenação (Hierarquia de Prioridade)
**Função:** `sortByPriority`
*   A lista de links normais é ordenada com base na "Hierarquia de Prioridade" definida no modo Automático (Qualidade, Idioma, Seeds).
*   A ordem de avaliação segue a ordem das setinhas definidas pelo usuário.
    *   Se **Qualidade** for o 1º: Ele ordena do maior `rankScore` (Resolução > Qualidade > HDR) para o menor. O codec não entra na balança de qualidade de imagem.
    *   Se **Idioma** for o 1º: Ele usa a função `getLangScore`. Links que têm o idioma preferido ganham 2 pontos. Links "Multi" ganham 1 ponto. Outros ganham 0. Ele coloca os de 2 pontos no topo.
    *   Se **Seeds** for o 1º: Ordena do maior número de seeds para o menor.
*   Se houver empate no critério 1, ele olha o critério 2, e assim por diante.

---

## 7. Limites (Modo Automático)
**Função:** `applySmartLimit`
*   Aqui o AddTORR corta a lista para não poluir a tela do Stremio.
*   Se o usuário escolheu **"Apenas o melhor resultado" (1 stream)**:
    *   Ele retorna estritamente **1 único resultado**.
    *   Como a lista já foi ordenada na etapa anterior (Hierarquia de Prioridade), ele simplesmente pega o primeiro link (o mais perfeito possível de acordo com as prioridades do usuário, seja priorizando Idioma, Qualidade ou Seeds).
*   Se o usuário escolheu **"X por resolução" (ex: 2 por resolução)**:
    *   Ele agrupa os links por resolução (4K, 1080p, etc).
    *   Pega os "X" melhores (já ordenados) de cada grupo.
    *   Junta tudo e retorna.

---

## 8. Streams Garantidos (Modo Manual)
**Função:** `buildGuarantees`
*   Se o modo "Streams Garantidos" estiver ativado, o AddTORR vai "pescar" links específicos da lista bruta (antes dos limites do modo automático) para garantir que eles apareçam no topo, com um selo (tag).
*   **Melhor Qualidade (💎):**
    *   Pega os links que passam nos filtros básicos e estritos (cache/seeds).
    *   Ordena puramente por: **Resolução > Formato de Lançamento (Remux, BluRay, WEB-DL) > HDR (DV, HDR10+, HDR) > Seeds > Idioma**.
    *   O codec não é considerado nesta etapa, focando apenas na melhor experiência visual.
    *   Pega o 1º (e os backups, se configurado) e coloca o selo (ex: 💎).
*   **Idioma Desejado (📌):**
    *   Pega links que passam nos filtros básicos E que **obrigatoriamente** tenham o idioma preferido.
    *   *Atenção:* Esta garantia **ignora o filtro de "Somente em Cache" e "Seeds Mínimos"** para tentar achar o idioma a todo custo. Se achar um com cache, ele prioriza, mas se não tiver, traz sem cache mesmo.
    *   Pega o 1º (e backups) e coloca o selo (ex: 📌).
*   **Mais Rápido (🔥):**
    *   Verifica a condição: "Só ativar se seeds normais < X". Se a lista normal já tem um link com mais seeds que X, ele não ativa essa garantia.
    *   Se ativar, pega os links que passam nos filtros básicos e estritos.
    *   Ordena puramente por Seeds > Cache > Resolução > Idioma.
    *   Pega o 1º (e backups) e coloca o selo (ex: 🔥).
*   **Idioma Original (🌍):**
    *   Pega a lista bruta e **aplica os filtros de cache/seeds** e tamanho.
    *   Ordena por **Resolução > Seeds > Qualidade**.
    *   Pega o 1º e coloca o selo 🌍.

---

## 9. Montagem Final e Formatação
**Função:** `aggregateStreams` (Final) e `renderTemplate`
*   O AddTORR junta tudo na seguinte ordem:
    1.  Link de Idioma Original (se ativado).
    2.  Links Garantidos (Qualidade, Idioma, Rápido).
    3.  Links Normais (do modo Automático).
*   Ele faz uma última deduplicação para garantir que um link que apareceu como "Garantido" não apareça de novo na lista de "Normais".
*   Por fim, ele usa o **Modelo de Formatação** (Preset) escolhido pelo usuário para substituir as variáveis (`{{quality}}`, `{{size}}`, etc.) pelos dados reais do link, montando o texto bonitinho que vai aparecer no Stremio.
*   A lista final é enviada de volta para o Stremio.
