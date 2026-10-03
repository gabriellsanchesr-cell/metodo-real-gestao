-- Biblioteca do Método R.E.A.L. (pacote padrão v2, gerado por
-- Gabriel Nutri/portal-materiais/pacote_v2.py; não editar à mão).
--
-- 1) Bucket privado conteudos-real para os PDFs da biblioteca e da Jornada.
--    Qualquer usuário logado (paciente ou nutri) lê; cada nutri escreve só
--    na própria pasta (<uid>/...).
-- 2) Conteúdos padrão em conteudos_real, publicados, do nutri gabriellsanchesr@gmail.com.
--    Jornada nas fases do banco (rotina=Rastreio, estrategia, autonomia=Ajuste,
--    liberdade=Lifestyle); Biblioteca em fase 'geral' com tag 'aba:<aba>'.
--    Pode rodar de novo: só insere o título que ainda não existe na fase.

insert into storage.buckets (id, name, public)
values ('conteudos-real', 'conteudos-real', false)
on conflict (id) do nothing;

drop policy if exists "Conteudos real: leitura logado" on storage.objects;
create policy "Conteudos real: leitura logado" on storage.objects
  for select to authenticated
  using (bucket_id = 'conteudos-real');

drop policy if exists "Conteudos real: nutri envia na propria pasta" on storage.objects;
create policy "Conteudos real: nutri envia na propria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'conteudos-real' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Conteudos real: nutri altera a propria pasta" on storage.objects;
create policy "Conteudos real: nutri altera a propria pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'conteudos-real' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Conteudos real: nutri apaga a propria pasta" on storage.objects;
create policy "Conteudos real: nutri apaga a propria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'conteudos-real' and (storage.foldername(name))[1] = auth.uid()::text);

do $$
begin
  if not exists (select 1 from auth.users where email = 'gabriellsanchesr@gmail.com') then
    raise exception 'Usuário gabriellsanchesr@gmail.com não encontrado em auth.users';
  end if;
end $$;

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Como funciona o Método R.E.A.L.$c$, 'rotina', 'texto', 'motivacao', 'publicado', $c$As quatro fases do acompanhamento e o que esperar de cada uma.$c$, $c$O Método R.E.A.L. é o jeito como eu organizo o acompanhamento. Ele nasceu de uma coisa que eu vejo todo dia no consultório: a maioria das pessoas não precisa de mais uma dieta. Precisa de um caminho que caiba na vida real.

Por isso ele tem quatro fases, e cada letra é uma delas.

## R de Rastreio
É o começo. Eu procuro entender a sua rotina, a sua fome, os seus horários, o que já funcionou e o que travou nas outras tentativas. Sem julgamento, só clareza.

## E de Estratégia
Com o rastreio feito, a gente define prioridades simples e monta um plano flexível, pensado para o seu dia a dia, e não para uma semana perfeita que não existe.

## A de Ajuste
O plano não nasce pronto. A cada retorno eu olho o que funcionou, o que ficou difícil e ajusto. É aqui que a estratégia vai ficando cada vez mais a sua cara.

## L de Lifestyle
É o objetivo desde o primeiro dia: hábitos que se sustentam sozinhos, com autonomia e leveza. Você aprende a se guiar sem depender de uma dieta para sempre.

---

Aqui no portal, a Jornada acompanha essas fases. Os conteúdos da sua fase aparecem primeiro, e os das fases anteriores continuam disponíveis para você rever quando quiser. Quem decide a mudança de fase sou eu, junto com você, pelo que a gente vê nos retornos.

Não existe pressa para passar de fase. Cada uma tem o seu tempo, e é exatamente isso que faz o resultado durar.$c$, null, $c$4 min$c$, array['metodo']::text[], 1, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'rotina' and c.titulo = $c$Como funciona o Método R.E.A.L.$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Fase Rastreio: o que acontece agora$c$, 'rotina', 'texto', 'rotina', 'publicado', $c$Por que o começo é sobre entender, e o que eu preciso de você nesta fase.$c$, $c$Você está na fase de Rastreio. Ela é curta, mas é a base de tudo o que vem depois.

Nesta fase o meu trabalho é entender como a sua alimentação funciona de verdade: os horários, a fome ao longo do dia, os momentos em que a comida vira conforto, o que você gosta, o que não suporta e o que a rotina permite. Um plano feito sem isso pode até ser bonito no papel, mas não aguenta uma semana corrida.

## O que ajuda muito agora
- Usar o diário alimentar do portal, com foto, sem caprichar no prato para a foto. Eu preciso ver a rotina como ela é.
- Registrar o peso quando eu pedir, sempre nas mesmas condições: de manhã, em jejum, depois de ir ao banheiro.
- Me contar pelo chat quando algo do plano não encaixar. Isso não é falha, é informação.

## O que não precisa fazer
- Mudar tudo de uma vez.
- Cortar grupos de alimentos por conta própria.
- Compensar um dia que saiu do combinado.

No fim do Rastreio a gente já sabe o que resolver primeiro. E é isso que vira a sua Estratégia.$c$, null, $c$3 min$c$, array['metodo']::text[], 2, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'rotina' and c.titulo = $c$Fase Rastreio: o que acontece agora$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Fase Estratégia: o plano começa a trabalhar por você$c$, 'estrategia', 'texto', 'alimentacao', 'publicado', $c$Prioridades simples, um plano flexível e como usar as opções e as trocas.$c$, $c$Você entrou na fase de Estratégia. Aqui o que a gente descobriu no Rastreio vira prioridade e plano.

Prioridade quer dizer escolher poucas coisas e fazer bem. Em vez de mudar dez hábitos ao mesmo tempo, a gente define dois ou três que mais pesam no seu resultado. Pode ser a proteína do café da manhã, o lanche da tarde que segura a fome do jantar, ou a água que sempre fica para depois.

## O plano flexível
O seu plano tem opções A, B e C em cada refeição e uma lista de substituições. Elas foram calculadas para ficarem equivalentes, então você pode escolher conforme o dia, sem fazer conta. A calculadora de substituições do portal ajuda quando você quiser trocar um alimento por outro.

## O que eu observo nesta fase
- Se as refeições estão saindo perto do combinado na maior parte dos dias, e não em todos.
- Como está a fome entre as refeições.
- Se o plano cabe na rotina ou se está pedindo esforço demais.

Estratégia boa é a que você consegue repetir. Se alguma parte está pesada, me fale: é sinal de que a gente precisa ajustar, e não de que você precisa se esforçar mais.$c$, null, $c$3 min$c$, array['metodo']::text[], 1, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'estrategia' and c.titulo = $c$Fase Estratégia: o plano começa a trabalhar por você$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Fase Ajuste: o plano aprende com você$c$, 'autonomia', 'texto', 'comportamento', 'publicado', $c$Como os retornos mudam o plano e por que o que travou é tão útil quanto o que funcionou.$c$, $c$Você está na fase de Ajuste. É a fase em que o plano deixa de ser o meu plano e passa a ser o nosso.

A cada retorno eu olho três coisas: o que funcionou, o que travou e o que mudou na sua vida. Às vezes o ajuste é pequeno, como trocar uma opção de lanche. Às vezes é maior, como mudar a distribuição das refeições porque o horário de trabalho mudou. O plano acompanha a vida, e não o contrário.

## Por que o que travou é tão importante
Quando uma refeição não sai nunca, ou um horário vive sendo pulado, isso me diz exatamente onde ajustar. Por isso eu peço que você conte o que não deu certo, sem medo de parecer que falhou. Para mim, é a informação mais valiosa do acompanhamento.

## O que muda para você
- Você começa a escolher com mais segurança entre as opções e as trocas.
- Os dias fora da rotina deixam de virar recomeço.
- A balança passa a ser um dado entre outros: medidas, fotos, fome, energia e sono também contam.

O objetivo desta fase não é perfeição. É chegar num plano que você executa quase no automático.$c$, null, $c$3 min$c$, array['metodo']::text[], 1, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'autonomia' and c.titulo = $c$Fase Ajuste: o plano aprende com você$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Fase Lifestyle: o plano passa a ser seu$c$, 'liberdade', 'texto', 'motivacao', 'publicado', $c$Autonomia, manutenção e como seguir sem depender de uma dieta para sempre.$c$, $c$Você chegou na fase Lifestyle. Esse era o objetivo desde o primeiro dia: hábitos que se sustentam com leveza.

Nesta fase o plano fica mais solto. Você já conhece as porções, sabe montar uma refeição equilibrada fora de casa e entende o que fazer quando o fim de semana sai do roteiro. O meu papel muda: eu deixo de dizer o que fazer e passo a ajudar você a decidir.

## O que muda
- Mais flexibilidade nas escolhas, mantendo a estrutura: proteína nas refeições, horários organizados, água e sono.
- Retornos mais espaçados, com foco em manutenção.
- Mais atenção aos sinais do corpo e menos aos números do dia.

## O que continua
A base que trouxe você até aqui continua valendo. Manutenção não é o fim do cuidado, é o cuidado virando rotina.

Se em algum momento a vida apertar e os hábitos escaparem, tudo bem. Você não volta para a estaca zero: volta para a Estratégia por um tempo, ajusta e segue. Saber voltar é parte de ter autonomia.$c$, null, $c$3 min$c$, array['metodo']::text[], 1, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'liberdade' and c.titulo = $c$Fase Lifestyle: o plano passa a ser seu$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Como usar o seu plano sem virar refém dele$c$, 'rotina', 'texto', 'alimentacao', 'publicado', $c$A, B e C, substituições e o que fazer quando o dia não sai como planejado.$c$, $c$Então, a primeira coisa que eu quero que você entenda sobre o seu plano é que ele não é uma prova. Ele é um mapa. E mapa a gente consulta, não decora.

Cada horário tem as opções A, B e C. Eu calculei as três para ficarem perto em calorias e em proteína, então trocar a A pela C não estraga nada. O que costuma estragar o dia é outra coisa: a gente sai um pouco do combinado, acha que perdeu o dia, e aí larga o resto. O problema nunca foi a opção B. O problema é a ideia de que existe um jeito certo e todo o resto é erro.

As substituições funcionam do mesmo jeito. Quando o plano diz que 100 g de arroz podem virar uma porção de batata, essa porção já vem calculada para entregar a mesma energia. Você não precisa fazer conta. Precisa só não trocar no olho, porque é no olho que um fio de azeite vira três colheres de sopa, e três colheres passam de 200 kcal sem a gente perceber.

Na prática, o que eu peço é simples: olhe a refeição antes de abrir a geladeira, escolha a opção que cabe no seu dia e siga com ela. Se não deu, use a troca. Se nem a troca deu, coma o mais parecido possível e siga para a próxima refeição normalmente.

Eu prefiro mil vezes você seguindo a opção B com tranquilidade do que a opção A com sofrimento. Plano bom é o que você consegue repetir.$c$, null, $c$3 min$c$, '{}'::text[], 3, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'rotina' and c.titulo = $c$Como usar o seu plano sem virar refém dele$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Água: quanto beber e por que isso aparece no intestino e na fome$c$, 'rotina', 'texto', 'rotina', 'publicado', $c$A meta do seu plano, como distribuir no dia e o que a cor da urina conta.$c$, $c$A meta de água do seu plano não é um número aleatório. Eu uso como base 35 ml por quilo de peso, então uma pessoa de 70 kg fica perto de 2,5 litros por dia. Calor, treino e suor aumentam essa conta.

Agora, por que isso importa tanto? A parte mais clara é o intestino. A fibra das frutas, dos legumes, do feijão e da aveia precisa de água para formar um bolo macio. Quando a gente aumenta a fibra e não aumenta a água, o intestino pode até piorar, porque a fibra fica seca e pesada.

Sobre a fome, tem uma certa controvérsia. Existe a ideia de que a gente confunde sede com fome, e às vezes isso acontece, mas a evidência não é forte o suficiente para eu te dizer que beber água emagrece. O que eu posso dizer é que, quando a hidratação está em dia, fica mais fácil perceber o que é fome de verdade.

O jeito mais simples de acompanhar é a cor da urina: amarelo clarinho é o sinal de que está bom. Amarelo escuro no meio da tarde quase sempre quer dizer que a água ficou para depois.

O que funciona na rotina é deixar a garrafa à vista e dividir o dia em partes. Por exemplo, uma garrafa até o almoço, outra até o fim da tarde e o restante à noite. Café, chá e leite também contam, mas não substituem a água inteira.$c$, null, $c$3 min$c$, '{}'::text[], 4, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'rotina' and c.titulo = $c$Água: quanto beber e por que isso aparece no intestino e na fome$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Por que tem proteína em todas as refeições do seu plano$c$, 'estrategia', 'texto', 'alimentacao', 'publicado', $c$O papel da proteína na saciedade, na massa magra e na distribuição do dia.$c$, $c$Se você reparar no seu plano, quase toda refeição tem uma fonte de proteína: ovo, frango, carne, peixe, iogurte, queijo, feijão. Isso não é mania de nutricionista esportivo. É estratégia.

A proteína é o nutriente que mais segura a fome. Uma refeição com proteína costuma deixar a gente satisfeita por mais tempo do que a mesma caloria vinda só de carboidrato. Então, quando o café da manhã é só pão com café, não é falta de força de vontade sentir fome às dez da manhã. É a montagem da refeição.

A segunda parte é o músculo. Quando o plano tem um déficit para perder gordura, o corpo pode usar músculo como fonte de energia. Proteína suficiente ao longo do dia, junto com o treino, é o que protege a massa magra. E manter massa magra é o que faz o resultado parecer resultado, e não só um número menor na balança.

Sobre a distribuição, existe discussão na ciência sobre o quanto importa dividir a proteína entre as refeições. O que eu faço na prática é ancorar as refeições principais com uma boa porção e deixar os lanches com uma porção menor, porque isso ajuda a fome e é fácil de repetir.

Se em algum dia a proteína de uma refeição não der, não precisa compensar dobrando na próxima. Siga o plano e observe como a fome responde.$c$, null, $c$3 min$c$, '{}'::text[], 2, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'estrategia' and c.titulo = $c$Por que tem proteína em todas as refeições do seu plano$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Fim de semana sem compensação$c$, 'estrategia', 'texto', 'comportamento', 'publicado', $c$Por que o sábado desanda e como quebrar o ciclo restrição, exagero, culpa.$c$, $c$O fim de semana costuma ser o lugar onde o plano parece desmoronar. E quase sempre a gente culpa o sábado, quando o sábado é só onde a conta da semana chega.

Funciona assim: de segunda a sexta a gente aperta, come menos do que o corpo pede, pula lanche, segura a fome. Aí chega o sábado, a rotina afrouxa, a comida está ali, e a fome acumulada aparece toda de uma vez. No domingo vem a culpa, e na segunda a gente promete compensar, cortando ainda mais. E o ciclo recomeça.

Vale olhar a conta. Um déficit de 400 kcal por dia, de segunda a sexta, soma 2.000 kcal na semana. Um sábado de exagero passa disso com facilidade. Então não é que o fim de semana seja fraco. É que a semana estava apertada demais para durar.

Por isso o seu plano não tem semana heroica. Ele tem comida suficiente durante a semana e, quando faz sentido, um momento livre planejado no fim de semana: uma refeição que você escolhe, come com calma e encerra.

O combinado mais importante é este: na segunda-feira volta o plano normal. Sem cortar café da manhã, sem treino dobrado, sem jejum para pagar o sábado. Compensação é o que mantém o ciclo vivo. Voltar ao normal é o que quebra.$c$, null, $c$4 min$c$, '{}'::text[], 3, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'estrategia' and c.titulo = $c$Fim de semana sem compensação$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Fome ou vontade? Um teste de dez minutos$c$, 'autonomia', 'texto', 'ansiedade', 'publicado', $c$Como diferenciar fome física de vontade emocional sem proibir nada.$c$, $c$Todo comer é emocional. A gente não consegue comer sem sentir alguma coisa: prazer, alívio, conforto. O problema é quando a comida vira a única resposta para emoções que não têm nada a ver com fome.

Então o objetivo aqui não é eliminar a vontade. É conseguir perceber qual das duas está falando.

A fome física chega aos poucos, aumenta com o tempo e aceita várias comidas. Se você está com fome de verdade, um prato de arroz, feijão e frango resolve. A vontade costuma chegar de repente, pede uma comida específica e não aceita substituto. Ninguém tem vontade súbita de comer brócolis.

O teste é simples. Quando bater a vontade, beba um copo de água, espere dez minutos fazendo outra coisa e se pergunte: por que eu estou comendo? O que eu quero atingir comendo isso? Às vezes a resposta é cansaço, tédio, ansiedade com o trabalho. Às vezes a resposta é: eu quero mesmo esse doce.

E tudo bem se for isso. Se depois dos dez minutos a vontade continuar, coma com calma, numa porção definida, prestando atenção no sabor, e siga o dia. O que eu não quero é a gente comendo escondido, rápido e com culpa, porque é assim que uma vontade vira um exagero.$c$, null, $c$3 min$c$, '{}'::text[], 2, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'autonomia' and c.titulo = $c$Fome ou vontade? Um teste de dez minutos$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Comer fora sem precisar de cardápio especial$c$, 'liberdade', 'texto', 'alimentacao', 'publicado', $c$Um roteiro para restaurante, self-service e festa que cabe em qualquer lugar.$c$, $c$Comer fora não precisa ser o momento em que o plano é suspenso. Dá para levar a lógica do plano para qualquer prato, mesmo sem saber as gramas.

Comece pela proteína e pelos vegetais. No self-service, isso quer dizer montar primeiro a salada e a carne, frango ou peixe, e só depois o carboidrato. Para o carboidrato, use a medida da mão: uma porção do tamanho da mão fechada costuma ficar perto do que está no seu plano.

Depois escolha um destaque. Se vai ter fritura, deixe o molho de lado. Se vai ter sobremesa, mantenha o prato principal mais simples. O problema raramente é um item. É somar todos ao mesmo tempo.

Um erro comum é pular a refeição anterior para guardar espaço. Parece estratégia, mas a gente chega no restaurante com tanta fome que come rápido e muito além do que pretendia. Faça o lanche do plano normalmente.

Sobre bebida alcoólica, a regra prática é intercalar cada dose com um copo de água e evitar ficar beliscando junto. E se a refeição passou do ponto, a próxima é normal. Sem compensação.$c$, null, $c$3 min$c$, '{}'::text[], 2, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'liberdade' and c.titulo = $c$Comer fora sem precisar de cardápio especial$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$O que fazer no dia seguinte a um exagero$c$, 'autonomia', 'texto', 'comportamento', 'publicado', $c$Por que a balança sobe e por que voltar ao normal funciona melhor do que compensar.$c$, $c$Depois de um dia em que a gente comeu bem além do planejado, a balança costuma subir um ou dois quilos. E isso assusta. Mas quase tudo ali é água, não gordura.

A explicação é simples. Uma refeição mais farta em carboidrato e sal faz o corpo guardar glicogênio nos músculos e no fígado, e cada grama de glicogênio vem acompanhado de água. O sal também segura líquido. Para virar um quilo de gordura, seria preciso comer cerca de 7.000 kcal além do que o corpo gasta, o que é muito mais do que um almoço de domingo.

Então o que fazer? Voltar ao plano normal na próxima refeição. Não pular o café da manhã, não fazer treino de punição, não cortar o carboidrato do dia. Beba a sua água, coma as refeições do plano, e em dois ou três dias a balança volta para onde estava.

O exagero de um dia não define o resultado. O que define é o que a gente faz com ele. Quem compensa costuma entrar no ciclo de restrição e exagero. Quem volta ao normal sai dele.$c$, null, $c$3 min$c$, '{}'::text[], 3, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'autonomia' and c.titulo = $c$O que fazer no dia seguinte a um exagero$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Como saber que você chegou na manutenção$c$, 'liberdade', 'texto', 'motivacao', 'publicado', $c$Os sinais de que o corpo e a rotina estão estáveis, além do número da balança.$c$, $c$Manutenção não é o momento em que o plano acaba. É o momento em que ele passa a ser seu.

Os sinais de que a gente chegou lá vão além do peso. O primeiro é a estabilidade: o peso oscila numa faixa pequena ao longo de semanas, sem esforço extra. O segundo é a fome: ela aparece nos horários de sempre e some quando a gente come o suficiente. O terceiro, e para mim o mais importante, é comer fora, viajar ou passar um fim de semana diferente sem ansiedade e voltar à rotina sem precisar recomeçar nada.

Na parte técnica, a manutenção é quando as calorias ficam perto do que o corpo gasta, sem o déficit da fase de perda. Na prática isso quer dizer comida um pouco mais solta, mais flexibilidade, e a mesma estrutura: proteína nas refeições, horários organizados, água e sono.

O que eu acompanho nessa fase não é só o número. É se as escolhas continuam saindo de você, sem depender de mim para cada decisão, porque esse era o objetivo desde o começo: autonomia, e não um plano para sempre.$c$, null, $c$3 min$c$, '{}'::text[], 3, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'liberdade' and c.titulo = $c$Como saber que você chegou na manutenção$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Antes de comprar qualquer suplemento$c$, 'geral', 'texto', 'alimentacao', 'publicado', $c$O que um suplemento faz, o que ele não faz e por que a prescrição é individual.$c$, $c$Suplemento é complemento. Ele ajuda a chegar onde a comida sozinha não chegou, mas não substitui um prato bem montado.

## Antes de comprar, vale saber
- O que eu prescrevo para você aparece no topo desta aba, com dose, horário e por quanto tempo. É a orientação que vale para o seu caso.
- Os guias abaixo explicam como escolher um produto de qualidade, para você não pagar caro por marketing.
- Suplemento que dá certo para outra pessoa pode não fazer sentido para você. Objetivo, exames, rotina e o que você já come mudam tudo.

## Sinais de produto ruim
- Promessa de resultado rápido ou de "queima de gordura".
- Mistura de muitos ingredientes numa fórmula só, sem a dose de cada um no rótulo.
- Preço muito abaixo do mercado para a mesma quantidade de proteína ou de princípio ativo.

Na dúvida antes de comprar, me mande a foto do rótulo pelo chat. Eu prefiro olhar antes do que você gastar com algo que não precisa.$c$, null, $c$2 min$c$, array['aba:suplementos']::text[], 1, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Antes de comprar qualquer suplemento$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Whey protein: como escolher um bom$c$, 'geral', 'texto', 'alimentacao', 'publicado', $c$Concentrado, isolado ou hidrolisado, quanto tomar e o que olhar no rótulo.$c$, $c$O whey protein é proteína do soro do leite. Ele não é obrigatório, mas facilita muito chegar na meta de proteína do dia, principalmente em rotinas corridas.

## Os três tipos
- **Concentrado (WPC):** de 70 a 80% de proteína, um pouco de carboidrato e gordura. É mais barato e serve para a maioria das pessoas.
- **Isolado (WPI):** acima de 90% de proteína, com pouquíssima lactose. Boa escolha para quem tem desconforto com leite.
- **Hidrolisado (WPH):** pré-digerido e mais caro. Raramente é necessário.

## O que olhar no rótulo
- **Proteína por dose:** entre 20 e 25 g. Abaixo disso, desconfie.
- **Lista de ingredientes curta:** basicamente proteína do soro, saborizante e adoçante.
- **Laudo ou certificação de pureza:** marcas sérias publicam.
- **Preço por grama de proteína:** compare assim, e não pelo preço do pote.

## Como usar
A dose comum é de 20 a 30 g de proteína, mais ou menos um scoop. Não existe horário obrigatório: no pós-treino é prático, e num lanche ele ajuda a segurar a fome. Com água fica mais leve, com leite fica mais saciante.

No guia completo em PDF tem a lista de marcas com bom custo-benefício no Brasil.$c$, u.id::text || '/padrao/guia-whey-protein.pdf', $c$3 min$c$, array['aba:suplementos']::text[], 2, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Whey protein: como escolher um bom$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Creatina: como escolher e como tomar$c$, 'geral', 'texto', 'exercicio', 'publicado', $c$Monohidratada, dose diária, mitos sobre rim e retenção de líquido.$c$, $c$A creatina é um dos suplementos mais estudados que existem. Ela ajuda o músculo a regenerar energia em esforços curtos e intensos, como a musculação, e por isso melhora força, desempenho e recuperação.

## Qual comprar
- **Creatina monohidratada.** É a forma estudada. Outras formas (HCL, Kre-Alkalyn) custam mais e não mostraram vantagem.
- **Rótulo com um ingrediente só:** creatina monohidratada. Misturas costumam ter menos creatina pelo mesmo preço.
- O selo **Creapure** indica matéria-prima de alta pureza, mas não é obrigatório para um bom produto.

## Como tomar
- **3 a 5 g por dia, todos os dias**, inclusive nos dias sem treino. O efeito vem do acúmulo no músculo, não da dose do dia.
- O horário não é o mais importante. Escolha um que você não esqueça.
- A fase de saturação, com doses maiores na primeira semana, é opcional.

## Mitos comuns
- **"Faz mal para o rim":** em pessoas saudáveis, os estudos mostram segurança. Quem tem doença renal precisa de avaliação antes.
- **"Incha":** a creatina leva água para dentro do músculo, e não para baixo da pele. O peso pode subir um pouco no começo, e isso não é gordura.

No guia completo em PDF tem a lista de marcas com bom custo-benefício.$c$, u.id::text || '/padrao/guia-creatina.pdf', $c$3 min$c$, array['aba:suplementos']::text[], 3, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Creatina: como escolher e como tomar$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Ômega 3: o que olhar no rótulo$c$, 'geral', 'texto', 'alimentacao', 'publicado', $c$EPA e DHA, concentração por cápsula, certificação e a melhor forma de tomar.$c$, $c$O ômega 3 é uma gordura essencial: o corpo não produz o suficiente, então ela precisa vir da comida ou da suplementação. As formas que importam são o **EPA** e o **DHA**, que estão nos peixes de água fria, como sardinha, salmão e anchova.

Linhaça, chia e nozes têm ômega 3 na forma vegetal (ALA). Eles fazem bem, mas o corpo converte muito pouco em EPA e DHA, então não substituem o peixe nem o suplemento.

## O que olhar no rótulo
- **EPA + DHA por cápsula,** e não a quantidade de "óleo de peixe". Muitas cápsulas de 1.000 mg têm só 300 mg de EPA + DHA.
- **Pelo menos 500 mg de EPA + DHA por cápsula** costuma ser um bom ponto de corte.
- **Certificação de pureza,** como IFOS, que garante controle de metais pesados e de oxidação.
- **Forma TG (triglicerídeo)** é melhor absorvida do que a forma etil éster.

## Como tomar
Junto de uma refeição com gordura, como o almoço ou o jantar. Em jejum a absorção cai e o gosto de peixe aparece mais. A dose depende do objetivo e dos seus exames, por isso ela vem na sua prescrição.

Para quem não come peixe, existe ômega 3 de algas. O guia completo em PDF tem a tabela comparando marcas.$c$, u.id::text || '/padrao/guia-omega-3.pdf', $c$3 min$c$, array['aba:suplementos']::text[], 4, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Ômega 3: o que olhar no rótulo$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Proteína vegetal em pó$c$, 'geral', 'texto', 'alimentacao', 'publicado', $c$Para quem não usa whey: as fontes, os blends e o que conferir antes de comprar.$c$, $c$A proteína vegetal em pó é a alternativa ao whey para quem tem intolerância à lactose, alergia ao leite ou não consome produtos de origem animal.

## As fontes
- **Ervilha:** boa quantidade de aminoácidos essenciais e digestão leve.
- **Arroz:** bem tolerada, mas sozinha é pobre em lisina.
- **Soja:** completa, mas pode incomodar quem é sensível.
- **Blends,** como ervilha com arroz: uma fonte cobre o que falta na outra, e o resultado fica parecido com o whey.

## O que conferir
- **20 g de proteína ou mais por dose.** Muitas têm menos de 15 g.
- **Prefira blends** a uma fonte única.
- **Poucos aditivos:** cuidado com excesso de espessantes e açúcar.

O uso é igual ao do whey: 20 a 30 g de proteína por porção, num lanche, no pós-treino ou dentro de receitas como panqueca e vitamina. As sugestões de marcas estão no guia completo em PDF.$c$, u.id::text || '/padrao/guia-proteina-vegetal.pdf', $c$2 min$c$, array['aba:suplementos']::text[], 5, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Proteína vegetal em pó$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$E-book: Suplementação descomplicada$c$, 'geral', 'pdf', 'alimentacao', 'publicado', $c$O guia completo sobre os suplementos mais usados: para que servem, para quem e como escolher.$c$, null, u.id::text || '/padrao/ebook-suplementacao-descomplicada.pdf', null, array['aba:suplementos']::text[], 6, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$E-book: Suplementação descomplicada$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Guia: como lidar com a vontade de doces$c$, 'geral', 'pdf', 'ansiedade', 'publicado', $c$Por que a vontade de doce aparece e estratégias práticas para lidar com ela sem proibição.$c$, null, u.id::text || '/padrao/guia-vontade-de-doces.pdf', null, array['aba:materiais']::text[], 1, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Guia: como lidar com a vontade de doces$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$E-book: Doce sem culpa$c$, 'geral', 'pdf', 'receitas', 'publicado', $c$Receitas de doces que cabem no plano, para ter prazer sem sair do combinado.$c$, null, u.id::text || '/padrao/ebook-doce-sem-culpa.pdf', null, array['aba:materiais']::text[], 2, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$E-book: Doce sem culpa$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Guia caseiro de medidas corporais$c$, 'geral', 'pdf', 'rotina', 'publicado', $c$Como medir cintura, quadril, braço e coxa em casa, do jeito certo, para acompanhar a evolução.$c$, null, u.id::text || '/padrao/guia-medidas-corporais.pdf', null, array['aba:materiais']::text[], 3, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Guia caseiro de medidas corporais$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$FODMAPs: guia para o intestino sensível$c$, 'geral', 'pdf', 'saude_intestinal', 'publicado', $c$O que são FODMAPs e quais alimentos costumam causar gases e desconforto. Use com a minha orientação.$c$, null, u.id::text || '/padrao/guia-fodmaps.pdf', null, array['aba:materiais']::text[], 4, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$FODMAPs: guia para o intestino sensível$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Guia prático: hipertensão$c$, 'geral', 'pdf', 'alimentacao', 'publicado', $c$Alimentação para ajudar no controle da pressão arterial: sal, rótulos e escolhas do dia a dia.$c$, null, u.id::text || '/padrao/guia-hipertensao.pdf', null, array['aba:materiais']::text[], 5, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Guia prático: hipertensão$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Guia prático: pré-diabetes e diabetes$c$, 'geral', 'pdf', 'alimentacao', 'publicado', $c$Como montar as refeições para ajudar no controle da glicemia, sem cortar tudo.$c$, null, u.id::text || '/padrao/guia-diabetes.pdf', null, array['aba:materiais']::text[], 6, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Guia prático: pré-diabetes e diabetes$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Uma refeição por dia sem tela e sem pressa$c$, 'geral', 'texto', 'alimentacao', 'publicado', null, $c$A saciedade leva uns 15 a 20 minutos para chegar. Comer rápido, em pé ou olhando o celular faz a gente terminar o prato antes de o corpo avisar que já bastou. Uma refeição por dia com calma já muda a percepção da fome.$c$, null, $c$1 min$c$, array['aba:orientacoes']::text[], 1, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Uma refeição por dia sem tela e sem pressa$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$A água do dia em três partes$c$, 'geral', 'texto', 'rotina', 'publicado', null, $c$Divida a meta do plano em três momentos: até o almoço, até o fim da tarde e à noite. Deixe a garrafa à vista. Urina amarelo clarinho é o sinal de que está em dia.$c$, null, $c$1 min$c$, array['aba:orientacoes']::text[], 2, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$A água do dia em três partes$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Sono curto aumenta a fome do dia seguinte$c$, 'geral', 'texto', 'sono', 'publicado', null, $c$Noites mal dormidas costumam aumentar a fome e a vontade de doce no dia seguinte. Se a noite foi ruim, não é o dia de cortar comida: siga o plano e priorize dormir mais cedo na próxima noite.$c$, null, $c$1 min$c$, array['aba:orientacoes']::text[], 3, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Sono curto aumenta a fome do dia seguinte$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Antes e depois do treino, sem complicar$c$, 'geral', 'texto', 'exercicio', 'publicado', null, $c$Antes do treino, uma fonte de carboidrato fácil (fruta, pão, tapioca) uma hora antes ajuda a ter energia. Depois, a próxima refeição do plano com proteína resolve. Não precisa de shake obrigatório.$c$, null, $c$1 min$c$, array['aba:orientacoes']::text[], 4, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Antes e depois do treino, sem complicar$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Intestino preso: fibra, água e horário$c$, 'geral', 'texto', 'saude_intestinal', 'publicado', null, $c$Fibra sem água pode piorar o intestino. Aumente os dois juntos, mantenha frutas e legumes do plano e tente ir ao banheiro no mesmo horário, de preferência depois do café da manhã.$c$, null, $c$1 min$c$, array['aba:orientacoes']::text[], 5, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Intestino preso: fibra, água e horário$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Foto do prato antes de comer$c$, 'geral', 'texto', 'comportamento', 'publicado', null, $c$Registrar a refeição no diário antes de comer ajuda mais do que contar calorias. A foto faz a gente olhar para o prato com atenção e mostra para mim como está a rotina de verdade, sem julgamento.$c$, null, $c$1 min$c$, array['aba:orientacoes']::text[], 6, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Foto do prato antes de comer$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Crepioca de frango com queijo$c$, 'geral', 'texto', 'receitas', 'publicado', $c$Café da manhã, jantar rápido, proteica. 360 kcal por porção, 10 minutos.$c$, $c$## Ingredientes
- 2 ovos
- 2 colheres de sopa de goma de tapioca (20 g)
- 60 g de frango desfiado
- 1 fatia fina de muçarela (15 g)
- sal e orégano a gosto

## Modo de preparo
Bata os ovos com a goma e uma pitada de sal. Despeje numa frigideira antiaderente aquecida e espalhe. Quando firmar, vire, coloque o frango e a muçarela em metade, dobre e deixe mais um minuto em fogo baixo.

## Por porção
**360 kcal** | Proteína 35,3 g | Carboidrato 19,9 g | Gordura 14,6 g | Fibra 0,0 g

Rende 1 porção. Tempo de preparo: 10 minutos. Valores calculados pela tabela TACO.$c$, null, $c$10 min$c$, array['aba:receitas', 'café da manhã', 'jantar rápido', 'proteica']::text[], 1, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Crepioca de frango com queijo$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Panqueca de banana e aveia$c$, 'geral', 'texto', 'receitas', 'publicado', $c$Café da manhã, pré-treino. 305 kcal por porção, 10 minutos.$c$, $c$## Ingredientes
- 1 banana madura
- 2 ovos
- 2 colheres de sopa de aveia em flocos (20 g)
- canela a gosto

## Modo de preparo
Amasse a banana, misture os ovos, a aveia e a canela. Faça discos pequenos numa frigideira antiaderente untada com um fio de óleo, vire quando aparecerem bolhinhas.

## Por porção
**305 kcal** | Proteína 16,9 g | Carboidrato 36,3 g | Gordura 10,7 g | Fibra 3,5 g

Rende 1 porção. Tempo de preparo: 10 minutos. Valores calculados pela tabela TACO.$c$, null, $c$10 min$c$, array['aba:receitas', 'café da manhã', 'pré-treino']::text[], 2, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Panqueca de banana e aveia$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Iogurte de pote com morango, aveia e chia$c$, 'geral', 'texto', 'receitas', 'publicado', $c$Lanche, sem fogão. 242 kcal por porção, 5 minutos.$c$, $c$## Ingredientes
- 1 pote de iogurte natural desnatado (170 g)
- 6 morangos picados (100 g)
- 2 colheres de sopa de aveia (20 g)
- 1 colher de chá de chia (8 g)
- 1 colher de chá de mel (8 g)

## Modo de preparo
Monte em camadas num pote: iogurte, fruta, aveia e chia. Finalize com o mel. Dá para deixar pronto na geladeira na noite anterior.

## Por porção
**242 kcal** | Proteína 11,8 g | Carboidrato 40,2 g | Gordura 4,8 g | Fibra 6,3 g

Rende 1 porção. Tempo de preparo: 5 minutos. Valores calculados pela tabela TACO.$c$, null, $c$5 min$c$, array['aba:receitas', 'lanche', 'sem fogão']::text[], 3, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Iogurte de pote com morango, aveia e chia$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Escondidinho de mandioca com carne moída$c$, 'geral', 'texto', 'receitas', 'publicado', $c$Almoço, marmita, congela bem. 446 kcal por porção, 35 minutos.$c$, $c$## Ingredientes
- 600 g de mandioca cozida
- 400 g de patinho moído
- 200 g de molho de tomate caseiro
- 60 g de muçarela ralada
- cebola, alho e cheiro-verde a gosto

## Modo de preparo
Amasse a mandioca cozida ainda quente com um pouco da água do cozimento até virar purê. Refogue a carne com cebola e alho, junte o molho e o cheiro-verde. Monte numa travessa: carne embaixo, purê por cima, muçarela, e leve ao forno até dourar. Rende 4 porções; os valores abaixo são de 1 porção.

## Por porção
**446 kcal** | Proteína 36,9 g | Carboidrato 49,1 g | Gordura 10,3 g | Fibra 3,1 g

Rende 4 porções. Tempo de preparo: 35 minutos. Valores calculados pela tabela TACO.$c$, null, $c$35 min$c$, array['aba:receitas', 'almoço', 'marmita', 'congela bem']::text[], 4, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Escondidinho de mandioca com carne moída$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Arroz de forno com frango e legumes$c$, 'geral', 'texto', 'receitas', 'publicado', $c$Almoço, marmita, aproveitamento. 398 kcal por porção, 30 minutos.$c$, $c$## Ingredientes
- 480 g de arroz cozido
- 400 g de frango desfiado
- 240 g de legumes picados (cenoura, ervilha, milho, abobrinha)
- 160 g de molho de tomate
- 60 g de muçarela ralada

## Modo de preparo
Misture o arroz, o frango, os legumes e o molho numa travessa. Cubra com a muçarela e leve ao forno por 15 minutos. Ótimo para aproveitar arroz e frango do dia anterior. Valores de 1 porção.

## Por porção
**398 kcal** | Proteína 39,6 g | Carboidrato 40,6 g | Gordura 7,5 g | Fibra 4,0 g

Rende 4 porções. Tempo de preparo: 30 minutos. Valores calculados pela tabela TACO.$c$, null, $c$30 min$c$, array['aba:receitas', 'almoço', 'marmita', 'aproveitamento']::text[], 5, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Arroz de forno com frango e legumes$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Omelete de forno com legumes e queijo minas$c$, 'geral', 'texto', 'receitas', 'publicado', $c$Jantar, sem glúten. 250 kcal por porção, 25 minutos.$c$, $c$## Ingredientes
- 4 ovos
- 160 g de legumes picados (tomate, espinafre, abobrinha, cebola)
- 60 g de queijo minas frescal em cubos
- sal, pimenta e orégano

## Modo de preparo
Bata os ovos com os temperos, misture os legumes e o queijo. Despeje numa forma pequena untada e asse a 200 graus por cerca de 20 minutos, até firmar. Valores de 1 porção (metade).

## Por porção
**250 kcal** | Proteína 19,8 g | Carboidrato 7,4 g | Gordura 15,1 g | Fibra 2,0 g

Rende 2 porções. Tempo de preparo: 25 minutos. Valores calculados pela tabela TACO.$c$, null, $c$25 min$c$, array['aba:receitas', 'jantar', 'sem glúten']::text[], 6, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Omelete de forno com legumes e queijo minas$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Wrap de atum com cenoura$c$, 'geral', 'texto', 'receitas', 'publicado', $c$Lanche, marmita fria, sem fogão. 238 kcal por porção, 5 minutos.$c$, $c$## Ingredientes
- 1 pão tipo Rap10
- 1 lata pequena de atum em água escorrido (60 g)
- 2 colheres de sopa de queijo cottage (30 g)
- cenoura ralada (30 g)
- folhas e limão a gosto

## Modo de preparo
Misture o atum com o cottage e o limão. Espalhe no pão, coloque a cenoura e as folhas e enrole bem firme.

## Por porção
**238 kcal** | Proteína 22,8 g | Carboidrato 23,0 g | Gordura 5,2 g | Fibra 2,4 g

Rende 1 porção. Tempo de preparo: 5 minutos. Valores calculados pela tabela TACO.$c$, null, $c$5 min$c$, array['aba:receitas', 'lanche', 'marmita fria', 'sem fogão']::text[], 7, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Wrap de atum com cenoura$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Salada morna de grão-de-bico com atum$c$, 'geral', 'texto', 'receitas', 'publicado', $c$Almoço, jantar, rica em fibra. 306 kcal por porção, 10 minutos.$c$, $c$## Ingredientes
- 100 g de grão-de-bico cozido
- 60 g de atum em água
- 80 g de legumes (tomate, pepino, cebola roxa)
- 1 colher de chá de azeite (5 g)
- limão, sal e salsinha

## Modo de preparo
Aqueça o grão-de-bico rapidamente na frigideira. Misture com o atum, os legumes picados, o azeite, o limão e a salsinha. Também fica bom frio, na marmita.

## Por porção
**306 kcal** | Proteína 25,8 g | Carboidrato 32,2 g | Gordura 8,4 g | Fibra 9,6 g

Rende 1 porção. Tempo de preparo: 10 minutos. Valores calculados pela tabela TACO.$c$, null, $c$10 min$c$, array['aba:receitas', 'almoço', 'jantar', 'rica em fibra']::text[], 8, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Salada morna de grão-de-bico com atum$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Receitas doces com whey protein$c$, 'geral', 'pdf', 'receitas', 'publicado', $c$Para matar a vontade de doce sem sair do plano.$c$, null, u.id::text || '/padrao/receitas-doces-com-whey.pdf', null, array['aba:receitas']::text[], 9, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Receitas doces com whey protein$c$);

insert into public.conteudos_real
  (user_id, titulo, fase, tipo, categoria, status, descricao, conteudo_texto, arquivo_path, duracao_estimada, tags, ordem, obrigatorio)
select u.id, $c$Hipercalórico caseiro$c$, 'geral', 'pdf', 'receitas', 'publicado', $c$Para quem precisa ganhar peso: uma vitamina caseira mais calórica, no lugar do pote pronto.$c$, null, u.id::text || '/padrao/hipercalorico-caseiro.pdf', null, array['aba:receitas']::text[], 10, false
from auth.users u
where u.email = 'gabriellsanchesr@gmail.com'
  and not exists (select 1 from public.conteudos_real c where c.fase = 'geral' and c.titulo = $c$Hipercalórico caseiro$c$);
