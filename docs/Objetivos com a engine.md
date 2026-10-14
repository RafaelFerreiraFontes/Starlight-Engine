# Sobre
---
Game Engine Starlight é um clone do Construct 3 que roda localmente que tem um runtime em C# ao invés de JS, tendo principais plugins e behaviors do Construct 3, funcionando sobre o runtime do MonoGame.

---
# Funcionamento 
---
A Starlight Engine funciona como uma fusão do (Construct 3 + Game Maker Studio 2), onde ela roda no seu computador, como uma forma mais fácil de programar e desenvolver jogos 2d e 3d.

---
## Projeto
---
Um **projeto** é um jogo, aplicativo completo criado na Starlight. Os projetos contêm todos os elementos do seu trabalho, desde sprites até arquivos de som. Onde os elementos de um projeto podem ser adicionados, renomeados, removidos e organizados em pastas dentro de um diretório. 

---
## Layouts/Rooms
---
Um **layout** é um conjunto predefinido de objetos. Ele pode representar uma fase de jogo, um menu, uma tela de título ou uma cena em uma animação. Em outras ferramentas, os layouts podem ser chamados de _cenas_ , _salas_ , _quadros_ ou _estágios_ . Eles podem ser adicionados, renomeados e excluídos. Os layouts são editados na Visualizador de Layout, onde é possível editar objetos dentro do layout selecionado. Cada Layout pode ter Scripts/EventSheets adicionados a ele, para alterar seu funcionamento ou mexer em objetos dentro dele.

---
### Layers
---
Uma **layer** é como uma folha de vidro transparente sobre a qual os objetos são pintados. As camadas podem ser usadas para mostrar diferentes grupos de objetos na frente ou atrás uns dos outros, como o primeiro plano e o plano de fundo. As camadas pertencem a um layout e podem ser adicionadas, editadas e removidas.

---
#### Z-index
---
Os objetos dentro de um layout são organizados por um `z-index`, onde cada layer vai de uma tupla contendo (`zindex-min`, `zindex-max`), sendo que um menor valor de `zindex` possível/armazenado é 0, objetos com `zindex` menor que zero são armazenados como 0, o `zindex-max` é valor maximo positivo do inteiro de 32 bits. As tuplas podem ser dividas de algumas formas: 50:50 (onde um intervalo da tupla tem 50 valores possíveis (0,49) ), 100:100, 150:150, 200:200, 500:500 e 1000:1000. Tudo depende como a engine decidir qual o melhor para organizar o projeto. Vários objetos podem ter o mesmo `z-index`, ele apenas indica a ordem que o objeto é mostrado, quanto maior o número mais a frente está o elemento na ordem de desenho (desenhado por ultimo), quanto menor mais atrás (desenhado primeiro)

---
#### Background Layer
---
Uma **Background Layer** (camada de fundo) é usada para renderizar cores sólidas ou sprites (imagens) atrás de todos os outros elementos do seu jogo. Por padrão, toda novo layout criado já vem com uma camada de background ativa. 

1. **Escolha uma Cor ou Sprite**
    - No painel de propriedades da camada, você pode definir uma **cor sólida**.
    - Para usar uma imagem, clique no campo **Sprite** para selecione um asset de sprite previamente importado.
2. **Ajuste as Propriedades**:
    - **Horizontal / Vertical Tile**: Repete a imagem infinitamente no eixo X ou Y (essencial para cenários longos ou infinitos).
    - **Stretch**: Estica a imagem para que ela ocupe todo o tamanho da room.
    - **Horizontal / Vertical Speed**: Faz o fundo se mover automaticamente em uma velocidade constante. 


---
#### GUI Layer
---
Existe **GUI Layer** uma camada sem `paralax` que fica fixa na tela sem movimentar os elementos nelas, muito util pra fazer `HUD`, `UI` ou `In-Game Menus`.

---
#### Global Layer/Import Layer
---
Às vezes, vários layouts em um projeto compartilham o mesmo conteúdo em uma camada específica, como interfaces ou HUDs sobrepostos. Alterar esse conteúdo torna-se trabalhoso, pois as alterações precisam ser repetidas em todos os layouts. **Global Layer** visam solucionar esse problema.

É possível tbm importa layers e de outro layaout para esse.

---
### Layout Clone (External Layouts)
---
**External Layouts** Essa técnica evita que você precise duplicar cenas inteiras, facilitando a otimização e a manutenção do seu jogo. 

- **Método 1**:
	Se você já desenhou um nível dentro de uma cena comum e quer transformá-lo em um layout reutilizável, é possível copiar todos os elementos de uma cena pra outra, apenas selecionado os objetos que deseja e exportando como um novo layout.
- **Método 2**:
	Se você quer um layout limpo, mas que use os mesmos objetos de uma cena padrão, basta escolher a opção ao criar um novo layout `usar um layout como base`, ele importara os objetos desse Layout em branco pra o dev posicionar e montar a fase com os mesmos elementos.
	
---
## Objetos
---
 **Os objetos** executam a maior parte do trabalho útil em um projeto. A maioria dos elementos que você vê em um projeto são representados por objetos, e também existem objetos ocultos para outras finalidades (como reprodução de áudio).

Ao inserir um novo objeto, normalmente você primeiro escolhe o `plugin` (por exemplo, _Sprite_ ). Isso cria um tipo de objeto (por exemplo, _TrollEnemy_ ). Quando o cursor do mouse se transforma em uma mira, você pode posicionar a primeira _instância_ e duplicar a instância para criar mais instâncias.

---
### Plugins
---
Os plugins definem um tipo de objeto. Por exemplo, um Sprite é um tipo de objeto, e o objeto de Áudio é outro tipo. Estes são definidos pelos _plugins Sprite_ e _Áudio_ , respectivamente.

Os desenvolvedores C# podem criar novos plugins (e comportamentos) usando o SDK de Addons, fornecendo como Addons de terceiros, podendo ser importado pelo dev em um projeto.

A maioria dos plugins define suas próprias propriedades na Barra de Propriedades, onde os plugins pode ser em três tipos:

1. **Os plugins visuais** (ex.: Sprite) aparecem no layout e desenham algo na tela.

2. **Plugins ocultos** (como o Array) são colocados em um layout específico, mas não desenham nada na tela.

3. **Plugins que afetam todo o projeto** (como Mouse e Áudio) são adicionados ao projeto inteiro e só podem ser adicionados uma vez. Não pode haver mais de um tipo de objeto ou instância de um plugin que afeta todo o projeto. Eles simplesmente habilitam uma nova funcionalidade (como a capacidade de receber entrada do mouse) para eventos.

---
### Object-Ref
---
Os **Object-Ref** são uma parte central do design de jogos na Starlight. Os `Object-Ref` definem uma "class" de um objeto. Por exemplo, _TrollEnemy_ e _OgreEnemy_ podem ser tipos de objetos diferentes de plugin Sprite . Eles têm animações diferentes e os eventos podem ser aplicados separadamente para que tenham aparências e comportamentos distintos, apesar de ambos serem objetos _TrollEnemy_ ou _OgreEnemy_.

Um `Object-Ref` representa um conjunto de plugins com uma função específica, similar aos [objects no Game Maker Studio 2](https://manual.gamemaker.io/lts/en/GameMaker_Language/GML_Reference/Asset_Management/Objects/Objects.htm), onde representa um marcado de uma instância no layout, sem ter uma posição, angulo ou tamanho real. Isso é passado direto pra runtime pra a criação de uma instancia de acordo com `object-ref`.

Pode haver várias instâncias de um `object-ref` em um projeto. Por exemplo, você pode querer que haja quatro objetos _TrollEnemy_ aguardando o jogador em um jogo. Essas quatro **instâncias** compartilham as mesmas animações, imagens, comportamentos, variáveis ​​de instância e eventos. (No caso de variáveis ​​de instância, cada instância armazena seu próprio valor exclusivo, por exemplo, para saúde, e os comportamentos também funcionam independentemente para cada instância.)

Dentro de `object-ref` é possível criar um Script/EventSheet onde é executado uma logica para cada instancia daquele objeto. Sendo possível tbm referência um `object-ref` em outro evento onde o runtime vai procurar uma instancia daquele objeto que atende a condição ou pedido.

É possivel tbm assim como o Game Maker Studio 2, fazer um [objeto herda elementos de outro](https://manual.gamemaker.io/lts/en/The_Asset_Editors/Object_Properties/Parent_Objects.htm), assim criando uma família, que tem os mesmo eventos e elementos do pai (exemplo:Sprite, Behavior Platformer) + os do próprio do filho (Sprite 2, Jump-thru). Sendo possível referência qualquer objeto da família atrás da `family-ref`.

---
### Instâncias de objetos

**Instâncias** de objetos são os objetos reais que você vê em um jogo: uma _instância_ de um `object-ref`. Por exemplo, se houver quatro _TrollEnemy_ em um layout, esses são quatro _instâncias_ do _tipo de objeto_ TrollEnemy .

São **instâncias** que possuem posição, ângulo e tamanho no layout. Os tipos de objeto não possuem essas propriedades — eles simplesmente definem uma 'classe' de objeto.

Instâncias podem ser criadas em tempo de execução em eventos (normalmente pela ação _"Criar objeto" do sistema). Elas também podem ser pré-organizadas em layouts com para projetar fases, menus e telas de título.

Selecionar uma instância na Visualização de Layout exibe suas propriedades. Essas propriedades são uma combinação de propriedades comuns a todos (ou à maioria) dos objetos e propriedades específicas do plugin. As propriedades comuns são descritas abaixo, e as propriedades específicas do plugin são descritas para cada plugin na seção de referência.

---
#### Propriedades comuns de instância
---
As seguintes propriedades são comuns à maioria dos objetos, dependendo de suas capacidades.

Nome

O nome do `object-ref` associado .

Global

Por padrão, todas as instâncias são destruídas quando o layout termina (por exemplo, ao passar para o próximo layout). Se ativado, nenhuma das instâncias desse tipo de objeto será destruída ao trocar de layout.

-Plugin (Read-Only)
	Um lembrete do plugin no qual este objeto se baseia.

- Posição
	As coordenadas X, Y e Z do objeto no layout, em pixels. Essa medida é feita a partir da origem do objeto. Esses valores também podem ser alterados movendo a instância na Visualização de Layout.
	
	A coordenada Z afeta apenas a ordem que o objeto é desenhado, em outras palavras é o `z-index` em 2D. Ela não afeta as colisões — todo o resto continua funcionando em 2D como se o valor de Z ainda fosse 0.

- Tamanho
	A largura e a altura da instância em pixels. Isso também pode ser alterado arrastando as alças de redimensionamento na Visualização de Layout. Para objetos 3D, como formas 3D , um terceiro componente de profundidade aparecerá aqui.

- Ângulo
	O ângulo em graus em que a instância está orientada. Isso também pode ser alterado girando o objeto na Visualização de Layout, clicando e arrastando logo fora das alças de redimensionamento.

- Rotação
	Quando suportado, a rotação 3D do objeto. Isso inclui a rotação em torno dos eixos X, Y e Z. A rotação no eixo Z funciona de forma semelhante à propriedade _Ângulo_ e é adicionada a qualquer ângulo existente.

- Opacidade
	A opacidade (ou semitransparência) da instância varia de 0% (transparente) a 100% (opaco).

- Cor
	Uma tonalidade de cor a ser aplicada à instância. Isso funciona normalizando cada componente de cor no intervalo de 0 a 1 e multiplicando-o pela cor do objeto. Isso significa que a cor branca (com 1 para cada componente de cor) exibe a cor original do objeto. Escolher outra cor irá matizar o objeto; por exemplo, escolher vermelho preservará apenas o componente de cor vermelha da imagem do objeto.

- Amostragem
	Substitui a configuração de amostragem de projeto, layout ou camada para esta instância. _"Automático"_ significa que será usada a configuração de amostragem de projeto, layout ou camada (a última que não especificar _"Automático_ "). Essa configuração também se aplica aos filhos em uma hierarquia se eles usarem _"Automático"_ , a menos que essas instâncias especifiquem um modo de amostragem diferente.

- Camada
	A camada em que a instância está localizada. Caso a instância selecionada seja de uma camada global em um layout diferente do layout atualmente ativo, o menu suspenso mostrará primeiro as camadas do layout de onde a instância realmente se origina, seguidas pelas camadas do layout que está atualmente ativo.  


- UID (Read-Only)
	Cada instância no projeto possui um número único atribuído, chamado de ID único ou UID. Esse valor é exibido no editor para que você possa visualizar o UID de instâncias específicas. Você pode usar condições como " _Selecionar por ID único"_ em eventos para selecionar instâncias específicas pelo seu UID.
	
	Pode ser mais conveniente usar tags de instância em vez de UIDs, pois elas podem ser mais descritivas.

- Etiquetas
	Uma lista de tags de texto separadas por espaços para identificar uma instância. A primeira tag de uma instância é usada em alguns locais do editor para melhor distinguir instâncias específicas. 

- Editar variáveis
	Abra a **caixa de diálogo Variáveis ​​de Instância do Objeto** .

- Editar Behaviors
	Abra a **caixa de diálogo Comportamentos do Objeto** .

- Efeitos de edição
	Abra a **caixa de diálogo Efeitos** .

- Recipiente
	Agrupe um conjunto de tipos de objetos para que eles criem, destruam e selecionem eventos em conjunto. 

- Modelo
	Um conjunto de propriedades para gerenciar modelos, que permite atualizar facilmente as propriedades de instâncias em todo o projeto. 

- Visível no editor
	Uma propriedade exclusiva do editor, que determina se a instância está visível ou não. 

- Trancado
	Uma propriedade exclusiva do editor, que determina se é possível interagir com a instância.

---
#### Variáveis ​​de instância
---
**As variáveis ​​de instância** são adicionadas a `object-ref` mas armazenam números, texto ou valores booleanos (indicadores ligado/desligado), enums (um conjunto de constantes acessíveis pelo um identificador em texto), variável de dicionário, variável array. Individualmente para cada instância . Isso as torna ideais para coisas como contadores de vida em um jogo, já que cada instância controla seu próprio valor. 

Variáveis ​​de instância também podem ser adicionadas a famílias.

---
#### Comportamentos
---
Os comportamentos adicionam funcionalidades extras aos `object-ref` . 

Um exemplo de comportamento é o comportamento de **8 direções** . Isso permite que um objeto seja movido instantaneamente com as teclas de seta. Isso ajuda a acelerar o desenvolvimento e aumentar a produtividade. Os comportamentos não foram projetados para fazer tudo no seu jogo por você: os eventos são onde a maior parte da lógica do seu jogo será definida. Os comportamentos são essencialmente ferramentas que economizam tempo e atalhos. A maioria dos comportamentos pode ser replicada com eventos, mas isso consome muito mais tempo. Os comportamentos são altamente personalizáveis, mas se um comportamento não estiver fazendo exatamente o que você deseja, geralmente é possível reproduzi-lo de forma personalizada com eventos.

Todas as instâncias de um `object-ref` usam seus comportamentos. Você não pode adicionar um comportamento apenas a algumas instâncias — todas usam o comportamento —, embora seja possível habilitar ou desabilitar o comportamento para instâncias individuais.

Alguns comportamentos adicionam suas próprias propriedades às propriedades do `object-ref`.

Alguns comportamentos também estendem os objetos aos quais são adicionados com suas próprias condições, ações e expressões. Estas são exibidas juntamente com as condições, ações e expressões do próprio objeto .

Comportamentos também podem ser adicionados às Famílias.

---
#### Contêineres

**Os contêineres** são um recurso fudamental que ajuda a construir _objetos compostos_ — ou seja, elementos do seu jogo feitos de múltiplos objetos. Por exemplo, um tanque em um jogo de estratégia pode ser composto de duas partes: um sprite para a base do tanque e um sprite diferente para a torre. Isso permite que eles girem independentemente. Adicionar ambos a um contêiner permite que os eventos tratem os dois objetos como se fossem um só, porque eles são sempre selecionados juntos.

Similar a como a Godot ou Unity faz o os seus nós e objetos, onde dentro do Player tem:(Player Sprite, Sword Sprite, Efeito de particula, Caixa de Colisão, etc.)

**Importante** os contêiner são o carro-chefe das instância, diferente do Construct 3/Gdevelop 5 onde os personagens são os Sprites, na Starlight o funcionamento é parecido com a Godot e Game Maker Studio 5, onde Sprites são apenas elementos de visualização com efeito e funções próprias, e um personagem geralmente contem um Sprite, Caixa de Colisão, Hitbox, Sistema de Particulas, Behavior Platformer, Behavior Jump-thru, Timer, etc. Onde essa coleção vai ter um Script/EventSheet chamado Player, que vai ter acesso a todos esses plugins, behaviors e efeitos e vai fazer o Player funcionar como deve.

---
## Eventos
---
Os eventos são um dos principais recursos do Starlight: em vez de scripts complicados ou linguagens de programação com sintaxe complexa e erros difíceis de resolver, você pode definir como seu projeto funciona usando um sistema de blocos mais simples. Os blocos são chamados coletivamente de eventos, embora existam vários tipos de blocos que compõem uma folha de eventos.

O conceito básico de eventos é que as condições **filtram** as instâncias que atendem à condição e, em seguida, as ações são executadas somente para _essas instâncias_ . Isso permite controlar instâncias independentemente, especialmente quando usado com variáveis ​​de instância. Um equívoco comum é que todas as instâncias de um tipo de objeto devem se comportar da mesma maneira. Isso não é verdade: o funcionamento fundamental dos eventos é filtrar instâncias individuais e executar ações apenas naquelas que atendem às condições.

**Os eventos** geralmente consistem em **condições** que devem ser atendidas, **ações** que são executadas caso isso ocorra e, opcionalmente, subeventos adicionais que testam mais condições, executam mais ações etc. Uma maneira simples de pensar em eventos é: "Se as condições forem verdadeiras, execute as ações". No entanto, lembre-se de que uma característica fundamental é que eles também filtram as instâncias que correspondem à condição. Por exemplo, se a condição _"Bullet colide com o alienígena"_ for atendida, a ação _"Destruir alienígena"_ será executada, e a ação _"Destruir_ " afetará apenas a instância envolvida na condição.

---
### Criação de scripts
---

Você pode usar exclusivamente o sistema de eventos do Construct e ainda assim criar projetos complexos com lógica sofisticada. No entanto, se você tiver interesse em aprender uma linguagem de programação, também pode usar C# no Starlight Engine.

---
### Condições
---
Em eventos, **as condições** filtram instâncias que atendem a determinados critérios. Elas aparecem à esquerda do evento. Todas as condições de um evento devem ser atendidas por pelo menos uma instância para que as ações sejam executadas. As ações, então, aplicam-se somente às instâncias que atenderam às condições.

**As condições do sistema** não selecionam nenhuma instância: elas são simplesmente verdadeiras ou falsas, a menos que façam referência específica a um objeto, como em " _Selecionar instância aleatória"_ .

Existem três tipos de condições: condições normais, condições **acionadas/gatilho** e condições **de repetição** . Você também pode criar blocos OR que são executados se _qualquer uma_ das condições for verdadeira, em vez de todas as condições.

---
#### Condições de inversão
---
As condições podem ser **invertidas** , o que inverte o que elas testam. Por exemplo, a condição _"Monstro está sobrepondo o Jogador"_ é verdadeira sempre que um monstro estiver tocando o jogador. No entanto, se invertida, ela aparece com um ícone vermelho de inversão e significa que _o Monstro **não** está sobrepondo o Jogador_ .

---
#### Pontos de interrupção
---
É possível inserir um ponto de interrupção em uma condição para pausar a execução quando ela for atingida no depurador .

---
### Ações
---
Em eventos, **as ações** executam alguma tarefa, como criar um objeto ou ir para outro layout. Elas aparecem à direita do evento.

As ações afetam apenas as instâncias que atendem às condições do evento .


---
#### Pontos de interrupção
---
É possível inserir um ponto de interrupção em uma ação para pausar a execução quando esse ponto for alcançado no depurador.

---
### Expressões
---
Em eventos, **expressões** são usadas para calcular somas ou recuperar informações de objetos, como a coordenada X de um Sprite. As expressões são inseridas na caixa de diálogo Parâmetros ao adicionar ou editar uma condição ou ação que possua parâmetros. O dicionário de Expressões também é exibido simultaneamente e fornece um dicionário de todas as expressões de sistema e de objeto disponíveis em um projeto.

Abaixo, são apresentados alguns exemplos de expressões, que podem variar de um simples número a um cálculo complexo:

- `0`
- `random(360)`
- `Sprite.X`
- `(Player1.X + Player2.X) / 2`
- `Sprite.8Direction.Speed`
- `Sprite.X + cos(Sprite.Angle) * Sprite.Speed * dt`

---
#### Números
---
Os números são inseridos simplesmente como dígitos com uma parte fracionária opcional separada por um ponto, por exemplo, `5`ou `-1.2`. Os números fracionários podem começar com um ponto, por exemplo `.5`, .

---
#### Texto (cadeias de caracteres)
---
Texto também é conhecido como _string_ no desenvolvimento de software, e o Construct às vezes também usa essa convenção de nomenclatura. O texto em expressões deve ser delimitado por aspas duplas, por exemplo:`"Hello"`

As aspas duplas não são incluídas como parte do texto, portanto, definir um objeto de texto para exibir a expressão `"Hello"`fará com que ele mostre **"Olá"** , sem aspas duplas. Para incluir aspas duplas em uma string, use duas aspas duplas lado a lado (""), por exemplo, `"He said ""hi"" to me"`retornará **"Ele disse 'oi' para mim"** .

Você pode usar `&`para construir strings a partir de texto e números misturados, por exemplo`"Your score is: " & score`

Para adicionar uma quebra de linha a uma string, use a expressão do sistema **`newline`** , por exemplo.`"Hello" & newline & "world"`

A expressão de sistema **`StringSub`** também é útil para construir strings. Você pode usá-la assim: que produzirá a string " **Olá Sam, sua pontuação é 100!"** . A primeira string pode usar _marcadores_ como `<br>` , `<br>`, etc., e estes são substituídos pelos parâmetros seguintes. Você pode ter quantos marcadores quiser e eles podem aparecer em qualquer lugar na primeira string, desde que o número apropriado de parâmetros a siga.`StringSub("Hi {0}, your score is {1}!", "Sam", 100)``{0}``{1}``{2}`

---
### Operadores
---
Você pode usar os seguintes operadores em expressões:

|Operador|Descrição|
|---|---|
|**+**|Adição|
|**-**|Subtração|
|*****|Multiplicação|
|**/**|Divisão|
|**%**|Módulo (resto da divisão)|
|**^**|Elevar à potência, por exemplo, 5 ^ 2 = 25|
|**&**|Construa strings, por exemplo`"Your score is: " & score`|
|**=** , **<>** , **<** , **<=** , **>** , **>=**|Operadores de comparação, por exemplo `score < 10`, retornam 1 se a comparação for verdadeira ou 0 se for falsa.|
|**?:**|Operador condicional, na forma `condition ? result_if_true : result_if_false`. Permite testar condições em expressões. A condição é considerada verdadeira se for diferente de zero e falsa se for zero. Exemplo:`score < 0 ? "Game over!" : "Keep going!"`|
|**&** , **\| ** | Quando usados ​​com números, `&`o operador lógico AND representa a operação lógica AND e | o operador lógico OR representa a operação lógica OR. (Observe que, se qualquer um dos lados for uma string, o `&` operador OR realiza a concatenação de strings.) Esses operadores são úteis em combinação com outros operadores de comparação, como o operador AND `score < 0` |
 `health < 0`, que retorna 1 se qualquer uma das condições for verdadeira e 0 se for falsa|

---
#### Expressões de objeto
---
Os objetos possuem suas próprias expressões para recuperar informações sobre eles. Essas expressões são escritas no formato `Sprite.X`(nome do objeto, um ponto e, em seguida, o nome da expressão). O dicionário de expressões lista todas as expressões disponíveis no projeto, e elas são documentadas com mais detalhes na seção de referência do manual.

A expressão `Self`pode ser usada como um atalho para se referir ao objeto atual. Por exemplo, em uma ação para o objeto _Player_ , `Self.X`refere-se a `Player.X`.

Você pode adicionar um índice de objeto baseado em zero para obter expressões de diferentes instâncias de objeto. Por exemplo `Sprite(0).X` ` 1.0` `Sprite(1).X`...`Sprite(-1).X`

---
#### Expressões comportamentais
---
Se um objeto tem um comportamento com suas próprias expressões, elas são escritas na forma `Object.Behavior.Expression`, por exemplo `Sprite.8Direction.Speed`.

---
#### Expressões do sistema
---
As expressões do sistema integrado estão listadas na referência. Estas incluem algumas funções matemáticas básicas como `sqrt`(raiz quadrada).

---
### Subeventos

**Os subeventos** aparecem recuados abaixo de outros eventos. Eles **continuam a execução a partir do ponto** em que o evento "pai" parou. Eles são executados após a conclusão das ações do evento pai.

---
#### Gatilhos em subeventos
---
Se um gatilho estiver em um subevento, **todas** as condições do evento pai devem ser verdadeiras no momento em que o gatilho for acionado; caso contrário, o evento não será executado.

Também só pode haver um gatilho em um único ramo de subeventos. Em outras palavras, um dos eventos acima de um gatilho não pode conter outro gatilho.

---
### Grupos de eventos
---
**Os grupos** de eventos servem principalmente para organizar eventos. Eles podem ser recolhidos e expandidos usando o botão de seta no título.

Os eventos podem ser **arrastados e soltos** dentro e fora dos grupos (certifique-se de arrastar a partir da margem do evento e não de uma condição ou ação). Grupos inteiros também podem ser ativados ou desativados com a ação de sistema _"Definir Grupo Ativo"_ , o que é útil em situações como pausar o jogo. Desativar grupos desnecessários também pode ajudar a melhorar o desempenho .

---
#### Personalizando cores
---
Você pode personalizar as cores do cabeçalho do grupo de eventos clicando com **o botão direito do mouse** e selecionando`Cores ► Alterar a cor do texto` ou `Cores ► Alterar cor de fundo` Para restaurar as cores padrão (que são baseadas no tema atual), selecione`Cores ► Restaurar cores padrão`.

---
### Comentários
---
**Os comentários** de eventos são simplesmente anotações para ajudar você a lembrar como os eventos funcionam e o que fazem. Eles são muito importantes para ajudar você a lembrar como as coisas funcionam em projetos grandes! Por padrão, os comentários têm um fundo amarelo e aparecem acima do evento que descrevem.

---
### Evento incluir
---
**A inclusão de** uma folha de eventos permite que você inclua uma folha de eventos em outra. É como se fosse uma cópia automática do conteúdo de uma folha para outra. Isso é útil para compartilhar eventos comuns a vários layouts. Por exemplo, um jogo pode usar folhas de eventos diferentes para diferentes partes da lógica. Você pode ter folhas de eventos chamadas " _Entrada do Jogador"_ , _"Controle do Inimigo"_ , _"Efeitos_ " e assim por diante. Então, cada nível do jogo pode incluir essas folhas de eventos comuns em sua própria folha de eventos. Isso permite que você compartilhe os mesmos eventos entre vários layouts, sem precisar copiar e colar todos os seus eventos repetidamente.

Similar ao conceito em linguagens de programação tradicionais de `import script`, dessa forma é possível criar lógicas complexas sem precisar colocar tudo em um arquivo, como por exemplo: Player State Machine, onde cada estado do player é um Event Sheet Separado pra ser chamado em cada momento.

---
### Funções
---
**As funções** são tipos especiais de blocos de eventos que podem ser chamados a partir de ações. Elas são projetadas para serem análogas às funções em linguagens de programação reais. O uso de funções pode ajudar a organizar planilhas de eventos e evitar a duplicação de grupos de ações ou eventos.

---
#### Adicionando uma função
---
Na folha de eventos, as funções são representadas como um tipo diferente de bloco de evento.

Depois de criada, a função aparece na folha de eventos de forma semelhante a um evento normal, mas com um ícone de função especial e o texto _"On function"_ na parte superior.

Você pode adicionar condições , ações e subeventos a funções, assim como faz com eventos normais. No entanto, as funções não são executadas a menos que sejam chamadas em uma ação. Depois de adicionar uma função ao seu projeto, um novo objeto especial " _Funções"_ aparece na caixa de diálogo "Adicionar ação" , ao lado do objeto "Sistema".

Ao selecionar este objeto, as funções do seu projeto são exibidas como se fossem ações.

Selecionar a função adiciona uma ação que chama (executa) a função.

As funções são semelhantes às ações personalizadas , mas não estão associadas a um tipo ou família de objetos específica. Esta ação executará o evento _de função On_ correspondente , incluindo a verificação de suas condições, a execução de ações e a execução de quaisquer subeventos, retornando em seguida à ação original e continuando de onde parou.

As funções por padrão funcionam localmente em um Event Sheet, podendo ser definidas como global, sendo possível acessar em outros Eventos, usando evento _Import From Event_.

Um bom exemplo de uso de funções é eliminar conjuntos repetidos de ações ou eventos.

---
#### Parâmetros
---
Ao chamar uma função, você também pode passar parâmetros. Esses parâmetros são números ou strings que ficam disponíveis para a função. Por exemplo, a função _`CreateEnemy`_ do exemplo anterior poderia ser modificada para receber dois parâmetros: as coordenadas X e Y nas quais o inimigo será criado. Isso ajuda a tornar as funções mais genéricas, utilizando informações adicionais da ação que chama a função.

Para adicionar um parâmetro a uma função, use a opção _"Adicionar parâmetro"_ ao clicar com o botão direito do mouse na função.

Os parâmetros funcionam de maneira muito semelhante às variáveis ​​locais: você pode usá-los em expressões, compará-los e defini-los como qualquer outro tipo de variável local. Assim como as variáveis ​​locais, seu escopo é limitado ao evento da função e seus subeventos.

Ao chamar a função, você também pode fornecer os parâmetros. Observe que o nome e a descrição definidos para os parâmetros são utilizados. Eles aparecem como parâmetros para qualquer outra ação, mas definirão os valores dos parâmetros ao chamar a função.

---
#### Retornando valores de funções
---
As funções também podem retornar um resultado. Por exemplo, uma função fatorial pode calcular o resultado matemático e retorná-lo.

Por padrão, as funções têm um tipo de retorno ` _None`_ , o que significa que não retornam nenhum valor. Isso também significa que são usadas como ações. No entanto, se você definir um tipo de retorno _`Number`_ , _`String`_ ou _`Any`_ , a função retornará um valor. Isso também significa que ela será usada como uma expressão, portanto, não aparecerá como uma ação.

Uma função pode definir seu valor de retorno usando a ação _"Definir valor de retorno"_ no objeto `Functions` integrado. Ela pode então ser chamada usando esse valor como uma expressão, por exemplo:

`Functions.MyFunction`

Os parâmetros também podem ser adicionados entre parênteses, por exemplo:

`Functions.MyFunction(1, 2, 3)`

A expressão retorna o valor definido pela ação _"Definir valor de retorno"_ na chamada da função.

Funções que retornam um valor também aparecerão no dicionário de expressões , serão exibidas no recurso de autocompletar e mostrarão dicas de chamada ao inserir parâmetros, assim como outras expressões. Em resumo, enquanto funções sem tipo de retorno são essencialmente ações personalizadas, funções com tipo de retorno são essencialmente expressões personalizadas.

---
#### Funções assíncronas
---
Na caixa de diálogo Adicionar/Editar Função , uma função pode ser definida como _Assíncrona_ (ou simplesmente _async_ ) . Isso permite que ela seja usada com a ação do sistema " _Aguardar a conclusão das ações anteriores"_ . Ou seja, se a função realizar alguma espera, como em uma ação do tipo " _Aguardar 3 segundos"_ , o chamador também poderá aguardar a conclusão da chamada da função com a ação " _Aguardar a conclusão das ações anteriores"_ .

Observe que isso impõe uma pequena sobrecarga de desempenho, portanto, para obter o melhor desempenho, deixe-o desativado se não precisar dele.

---
#### Mapas de funções

Às vezes, é útil poder chamar uma função dependendo de uma string determinada em tempo de execução. O recurso de mapeamento de funções permite isso. 

---
#### Aninhamento e recursão
---
Assim como em linguagens de programação, as funções suportam a chamada de outras funções e a chamada de si mesmas (recursão). Funções que chamam outras funções ou que são recursivas criam uma nova entrada na pilha de chamadas com suas próprias variáveis ​​únicas. Em outras palavras, assim como em linguagens de programação, variáveis ​​locais e parâmetros são únicos em cada nível de chamada de função. Isso não se aplica a variáveis ​​locais estáticas ou variáveis ​​globais.

---
#### Integração de JavaScript
---

---
##### Criação de scripts
---
Ao usar scripts no Construct , utilize runtime.callFunction para chamar uma função de evento a partir do script.

---
##### chamadas externas
---
Em outros casos, é altamente recomendável usar o SDK de complementos para integrar o código JavaScript ao Construct.

---
### Variáveis ​​de evento
---
**As variáveis ​​de evento** são valores numéricos ou de texto que podem ser **globais** para todo o projeto ou **locais** para um intervalo de eventos. Elas são modificadas usando a caixa de diálogo Variáveis ​​de Evento. Para adicionar uma variável de evento, **clique com o botão direito do mouse** em um evento, em outra variável ou em um espaço vazio na folha de eventos e selecione`Adicionar variável global` ou `Adicionar variável local` Ou pressione um `atalho de teclado` . As variáveis ​​no nível raiz da folha de eventos (não recuadas abaixo de nada) tornam-se variáveis ​​globais, enquanto as variáveis ​​em grupos ou subeventos tornam-se variáveis ​​locais.

As variáveis ​​de evento são modificadas pelas ações do sistema na categoria _Variáveis ​​globais e locais_ . Elas podem ser recuperadas simplesmente usando seus nomes em expressões .

---
#### Variáveis ​​globais
---
As variáveis ​​globais são representadas por um ícone de globo. Elas estão sempre no nível superior de uma planilha de eventos — não são subeventos nem estão dentro de nenhum grupo.

As variáveis ​​globais armazenam seus valores entre layouts. Eventos em qualquer layout podem acessar qualquer variável global, mesmo que ela tenha sido criada em uma folha de eventos diferente que não esteja incluída.

As variáveis ​​globais podem ser movidas para outra planilha de eventos recortando e colando-as. Após o recorte, as referências à variável global desaparecerão, pois ela foi removida; isso é normal e não há motivo para preocupação. Ao colar a variável global, as referências que desapareceram reaparecerão. Como alternativa, você pode **clicar com o botão direito do mouse** na variável global e selecionar `Ir para a folha de eventos...`.

---
#### Variáveis ​​locais
---
Variáveis ​​locais são variáveis ​​aninhadas em outros eventos ou dentro de um grupo. Elas também são exibidas com um ícone diferente das variáveis ​​globais.

A principal diferença entre variáveis ​​globais e locais é que **as variáveis ​​locais só podem ser acessadas dentro do seu escopo** . O escopo de uma variável local é o seu nível de subeventos. Todos os outros eventos no mesmo nível de indentação, ou em níveis inferiores, podem acessar a variável local. Eventos _acima_ dela (com menos indentação) _não podem_ acessar a variável local.

Por exemplo, se uma variável de evento estiver em um grupo de eventos, ela se torna uma variável local. Nesse caso, ela só aparecerá como uma opção para uma variável em eventos dentro desse grupo. Em outros grupos ou em outras planilhas de eventos, ela não aparecerá e não poderá ser acessada. Isso torna a variável _local_ ao _escopo_ em que está inserida.

Variáveis ​​locais são convenientes para armazenar temporariamente valores de variáveis ​​em um curto período de tempo, como para calcular uma média (onde uma variável _de soma_ temporária pode ser necessária). Isso também ajuda a manter o projeto simples, pois evita a necessidade de criar mais variáveis ​​globais, que aparecem em todo o projeto mesmo que não sejam necessárias em todos os lugares.

O escopo das variáveis ​​locais foi projetado para imitar o funcionamento do escopo de variáveis ​​em linguagens de programação reais.

---
##### Parâmetros da função
---
Os parâmetros de função são um tipo especial de variável local, com escopo restrito a um evento da função. Para mais informações, consulte a seção sobre Funções .

---
#### Variáveis ​​estáticas e constantes
---
Por padrão, as variáveis ​​locais retornam ao seu valor inicial sempre que entram em seu escopo (geralmente a cada ciclo de execução), assim como as variáveis ​​locais em linguagens de programação. Se a variável for marcada como _estática_ na caixa de diálogo Variável de Evento, ela manterá seu valor permanentemente, como uma variável global.

Variáveis ​​globais e locais podem ser marcadas _como constantes_ . Isso as torna somente leitura: elas podem ser recuperadas e comparadas, mas não alteradas.

---
#### Encontrando referências a variáveis
---
Você pode visualizar rapidamente uma lista de todas as referências a uma variável global ou local **clicando com o botão direito do mouse** sobre ela e selecionando `Encontre todas as referências...` Isso abrirá a barra de Resultados da Busca com uma lista de todos os locais no projeto onde a variável é usada. Isso também é útil para identificar se não há referências, para que a variável possa ser excluída com segurança.

---
