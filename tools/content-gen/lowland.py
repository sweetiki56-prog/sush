# Stage N content generator: the rest of Низовье. Run from the repo root; idempotent.
import json, sys
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from jsonfmt import table

F=lambda k,v=None: {"type":"flag","key":k,**({} if v is None else {"value":v})}
Q=lambda q,s: {"type":"quest","quest":q,"stage":s}
G=lambda i,n=None: {"type":"give","item":i,**({} if n is None else {"qty":n})}
T=lambda i,n=None: {"type":"take","item":i,**({} if n is None else {"qty":n})}
CAPS=lambda n: {"type":"caps","amount":n}
INC=lambda k,by=1: {"type":"inc","key":k,"by":by}
KARMA=lambda n: {"type":"karma","amount":n}
XP=lambda n: {"type":"xp","amount":n}
BARTER=lambda t: {"type":"open","window":"barter","id":t}
GOTO=lambda m,e: {"type":"goto","map":m,"entry":e}
JOIN=lambda i: {"type":"join","id":i}
LEAVE=lambda i: {"type":"leave","id":i}
def opt(text,next=None,**kw):
    o={"text":text}
    for k in ("if","effects","check"):
        if k in kw: o[k]=kw[k]
    if next: o["next"]=next
    return o
def node(text, options, effects=None):
    n={"text":text}
    if effects: n["effects"]=effects
    n["options"]=options
    return n
BYE=lambda t="Отойти.": opt(t)
def dlg(speaker, entry, nodes, portrait=None):
    d={"speaker":speaker}
    if portrait: d["portrait"]=portrait
    d["entry"]=entry; d["nodes"]=nodes
    return d
def chk(skill=None, attr=None, mod=0, pass_=None, fail=None, pe=None, fe=None):
    c={}
    if skill: c["skill"]=skill
    if attr: c["attr"]=attr
    c["mod"]=mod; c["pass"]=pass_; c["fail"]=fail
    if pe: c["passEffects"]=pe
    if fe: c["failEffects"]=fe
    return c
E=lambda *conds: [{"if":list(c),"node":n} if c else {"node":n} for *c,n in conds]
fl=lambda k,eq=None: {"flag":k,**({} if eq is None else {"eq":eq})}
nf=lambda k: {"notFlag":k}
it=lambda i: {"item":i}
ni=lambda i: {"noItem":i}
caps=lambda n: {"caps":n}
at=lambda a,n: {"attr":a,"gte":n}
atl=lambda a,n: {"attr":a,"lt":n}
sk=lambda s,n: {"skill":s,"gte":n}


D={}
# ================= the Dead fields: Свинцовый, the lead flower, the herd =================
LF=lambda how,extra=[]: [F("lead_flower",how),Q("lead_flower","done"),G("lead_bloom"),F("dry_cure"),XP(150)]+extra
HD=lambda how,extra=[]: [F("herd",how),Q("herd","done"),XP(120)]+extra
D['gvozdar']=dlg("Староста Гвоздарь",E([fl("lead_flower"),"after"],["intro"]),{
 "intro":node("Широкий мужик в соломенной шляпе загораживает калитку. — Гвоздарь. Это мой хутор, моя земля и мои цветы. Отравленная земля, говорите? Зато ничья — была, пока мы не пришли.",[
  opt("Сухостои идут к хутору. Чуют воду.","herd",**{"if":[nf("herd")]}),
  opt("Мне нужны свинцовые цветы — для приюта Тишины.","flower",**{"if":[fl("lead_flower_asked")]}),
  BYE()],[Q("herd","asked")]),
 "herd":node("Гвоздарь мрачнеет. — Знаю. Ходят кругами. — Он косится на бочку под рогожей. — Воды у нас нет. Нечем им пахнуть.",[
  opt("Отдайте стаду воду из бочки под рогожей — попьют и уйдут.",None,**{"check":chk(skill="speech",mod=0,pass_="shared",fail="no",pe=HD("shared",[F("svinec_grateful")]))}),
  opt("Подготовьте факелы. Встретим их у изгороди.","fire",**{"effects":[F("herd_fight")]}),
  opt("…","intro")]),
 "shared":node("Гвоздарь долго молчит, потом сам откатывает бочку за изгородь. Стадо пьёт и уходит в поля. — Тридцать лет копили, — говорит он. — Ну и пусть.",[BYE("…")]),
 "no":node("— Нет у нас воды.",[opt("…","intro")]),
 "fire":node("Хуторяне хватают факелы. Стадо уже у изгороди.",[BYE("…")]),
 "flower":node("— Цветы? — Гвоздарь хмыкает. — Поляна — наша. Мы пьём с этой земли, едим с неё, хороним в ней. Не отдам.",[
  opt("Сто пятьдесят капель за одну срезку.","bought",**{"if":[caps(150)],"effects":[CAPS(-150)]+LF("bought")}),
  opt("Стадо ушло благодаря мне. Одна срезка — за это.","talked",**{"if":[fl("svinec_grateful")],"effects":LF("talked")}),
  opt("Полусухие умирают от «деревенения». Это лекарство, а не букет.",None,**{"check":chk(skill="speech",mod=-15,pass_="talked",fail="refuse",pe=LF("talked"))}),
  opt("Уходите с отравленной земли. Сами.","drive"),
  opt("…","intro")]),
 "bought":node("Гвоздарь пересчитывает капли и сам срезает охапку. — Приходи ещё. С каплями.",[BYE("…")]),
 "talked":node("Гвоздарь машет рукой. — Режь. Только корни не трогай.",[BYE("…")]),
 "refuse":node("— Не отдам.",[opt("…","intro")]),
 "drive":node("— Это угроза? — Хуторяне подходят ближе. Но их трое, и они фермеры. Гвоздарь сплёвывает, собирает своих и уходит в поля, не оглядываясь.",[opt("…",**{"effects":LF("driven",[F("svinec_empty"),KARMA(-3)])})]),
 "after":node("— Цветы растут. Земля помнит.",[BYE()])},"portrait_gvozdar")
D['svinec_farmer']=dlg("Хуторянин",E(["hi"]),{"hi":node("— Говорят, земля отравлена. А картошка растёт. Свинцовая, но растёт.",[BYE()])})
D['lead_glade']=dlg("Свинцовый цветок",E(["look"]),{"look":node("Тяжёлые сизые головки на серых стеблях. Цветут только там, где упал Суховей.",[BYE()])})
D['hidden_barrel']=dlg("Бочка под рогожей",E([fl("herd"),"done"],["look"]),{
 "look":node("Бочка под рогожей. Внутри плещется вода — немного, но запах слышен даже тебе.",[
  opt("Наполнить пустую бочку каплей воды и укатить в поля — пусть стадо идёт за ней.","decoy",**{"if":[it("flask")],"effects":[T("flask")]+HD("decoy",[F("svinec_grateful")])}),
  BYE()]),
 "decoy":node("Пустая бочка с каплей воды катится в поля. Стадо поворачивает за запахом и уходит к горизонту.",[BYE("…")]),
 "done":node("Бочка под рогожей.",[BYE()])})
# ---- Хлебное ----
BL=lambda how,extra=[]: [F("bell",how),Q("bell","done"),XP(120)]+extra
D['ponomar']=dlg("Пономарь",E(["intro"]),{
 "intro":node("На колокольне — высохший, серый человек с верёвкой в руках. — Вечерня, — говорит он медленно. — Отец Аввакум велел звонить к вечерне. Я звоню. Двести лет звоню. Он всё не идёт.",[
  opt("Пойдём в приют Тишины. Там ждут таких, как ты.","led",**{"effects":BL("led",[F("ponomar_in_silence")])}),
  opt("Вечерня окончена. Отец Аввакум велел отдохнуть.",None,**{"check":chk(skill="speech",mod=0,pass_="vespers",fail="ring",pe=BL("vespers"))}),
  opt("Звони дальше.","left",**{"effects":BL("left",[F("bell_calls")])})]),
 "led":node("Пономарь бережно сматывает верёвку. — В приют… Там тоже звонят? — Он спускается, ступенька за ступенькой.",[BYE("…")]),
 "vespers":node("Пономарь кивает, будто слышал это много раз и наконец поверил. Он садится у колокола и закрывает глаза. Колокол замолкает.",[BYE("…")]),
 "ring":node("— Он не говорил, — упрямо отвечает Пономарь и тянет верёвку.",[BYE()]),
 "left":node("Колокол бьёт снова. Над полями поднимаются головы Сухостоев.",[BYE("…")])},"portrait_ponomar")
D['suhovey_store']=dlg("Склад бочек",E(["look"]),{"look":node("Жёлтые бочки с чёрной полосой: «Суховей. Опытная партия». Половина вскрыта. От склада к дороге на Элеватор — свежие следы телег.",[BYE()],[F("brew_clue")])})

# ================= the shelter =================
RD=lambda how,extra=[]: [F("silence_raid",how),Q("silence_raid","done"),XP(150)]+extra
D['kora']=dlg("Матушка Кора",E(["intro"]),{"intro":node("Старуха с кожей, как кора, говорит медленно, будто растёт. — Кора. Мы тут тихие. Лечим. Пишем. Ждём, пока нас оставят в покое.",[
 opt("Что такое «деревенение»?","wood"),BYE()]),
 "wood":node("— Суховей сушит землю. А нас — изнутри: пальцы деревенеют, потом сердце. Свинцовый цветок помогает. Растёт только на отравленной земле. Тимофей знает, где.",[opt("…","intro")])},"portrait_kora")
D['halfdry']=dlg("Полусухой",E(["hi"]),{"hi":node("Полусухой медленно поднимает глаза от книги. — Тише. Здесь пишут.",[BYE()])})
D['silence_books']=dlg("Книги Полусухих",E(["look"]),{"look":node("Рукописи на обёрточной бумаге: «Травы Мёртвых полей», «Довоенная Сушь. Что помню», «Как жить медленно».",[BYE()])})
D['timofey']=dlg("Тимофей Книжник",E([fl("met_timofey"),"again"],[fl("lead_flower"),"cured"],["intro"]),{
 "intro":node("Сухой старик в очках закрывает книгу на пальце. — Тимофей. Книжник. Мне сто восемьдесят лет, и я помню, как пахла Светлая. — Он смотрит на тебя внимательно. — Вы идёте далеко. Возьмите меня с собой — когда-нибудь. А сейчас — цветы.",[
  opt("Какие цветы?","flower"),
  opt("[Обаяние] Пойдём со мной сейчас. Цветы найдём по дороге.","join",**{"if":[at("cha",7)],"effects":[JOIN("timofey")]}),
  BYE()]),
 "flower":node("— Свинцовый цветок. Лекарство от деревенения. Растёт на поляне у хутора Свинцовый, но староста его не отдаст. — Тимофей вздыхает. — Или семена… в «Росе-2», говорят, были семена всего.",[
  opt("Семена есть у меня — Пётр из «Росы-2» дал лекарство. Вырастим в Колючке.","grown",**{"if":[fl("lab_tech")],"effects":[F("lead_flower","grown"),Q("lead_flower","done"),F("dry_cure"),XP(150)]}),
  opt("[Наука] Цветок можно вырастить на любой отравленной земле — дай семена, посажу в Колючке.","grown",**{"if":[sk("science",50)],"effects":[F("lead_flower","grown"),Q("lead_flower","done"),F("dry_cure"),XP(150)]}),
  opt("Найду цветы.","intro")],[F("lead_flower_asked"),Q("lead_flower","asked")]),
 "grown":node("Тимофей бережно пересчитывает семена. — В Колючке у Прокопа есть грядка под живицу… Да. Вырастет. — Он впервые улыбается.",[opt("…","cured")]),
 "cured":node("— Лекарство есть. Пальцы у Коры уже гнутся. — Тимофей встаёт. — Я обещал пойти с вами. Иду.",[opt("Пойдём.","join",**{"effects":[JOIN("timofey")]}),BYE("Позже.")]),
 "again":node("— Опять дорога? Книга подождёт.",[opt("Пойдём.","join",**{"effects":[JOIN("timofey")]}),BYE()]),
 "join":node("Тимофей кладёт книгу в мешок. — Я буду записывать. Всё, что увидим.",[BYE("…")])},"portrait_timofey")
# the captain and his men leave the map with the raid's outcome: the flags go on the last «…»
D['suhorukov']=dlg("Капитан Сухоруков",E(["intro"]),{
 "intro":node("Офицер Треста в серой шинели стоит у ворот приюта, за ним — сборщики с факелами. — Капитан Сухоруков. Приказ: очаг заразы ликвидировать. Отойдите.",[
  opt("Полусухие не заразны. Вот записи «Росы»: это последствие Суховея, а не мор.","talked",**{"if":[it("fresh_cure")]}),
  opt("Полусухие не заразны. Вот записи «Росы»: это последствие Суховея, а не мор.","talked",**{"if":[fl("lab_tech")]}),
  opt("[Наука] Деревенение не передаётся. Это отравление, а не мор — вот как его отличить.","talked",**{"if":[sk("science",50)]}),
  opt("Дай им уйти в Колючку. Сжигать будет нечего.","move"),
  opt("Только через меня.","fight",**{"effects":[F("raid_fight")]}),
  BYE()]),
 "talked":node("Сухоруков долго смотрит на бумаги, потом на Полусухих у грядок. — Отбой, — говорит он сборщикам. — Доложу, что очага не обнаружено.",[opt("…",**{"effects":RD("talked")})]),
 "move":node("— В Колючку? — Сухоруков хмыкает. — Пусть Прокоп сам их кормит. — Он даёт полчаса на сборы.",[
  opt("Прокоп примет — Колючка уже помогает Полусухим.","moved",**{"if":[fl("resin_thief","open")]}),
  opt("Уговорю Прокопа по дороге.",None,**{"check":chk(skill="speech",mod=-10,pass_="moved",fail="nomove")}),
  opt("…","intro")]),
 "moved":node("Полусухие уходят караваном в Колючку: медленно, с книгами за спиной. Приют пустеет, но никто не сгорит.",[opt("…",**{"effects":RD("moved",[F("silence_gone")])})]),
 "nomove":node("— Полчаса прошли, — говорит Сухоруков.",[opt("…","intro")]),
 "fight":node("— Значит, и тебя спишем на заразу. — Сборщики поднимают гвоздомёты.",[BYE("…")])},"portrait_raid_captain")
D['raid_collector']=dlg("Сборщик Треста",E(["hi"]),{"hi":node("— Приказ есть приказ.",[BYE()])})

# ================= the Elevator =================
D['thirst_guard']=dlg("Охрана «Жажды»",E(["hi"]),{"hi":node("— Пришёл за «Миражом» — плати. Пришёл за делом — иди к Сизому, наверх.",[BYE()])})
TK=lambda how,extra=[]: [F("stolen_truck",how),Q("stolen_truck","done"),XP(120)]+extra
D['stolen_truck']=dlg("Водовоз Треста",E([fl("stolen_truck"),"done"],["look"]),{
 "look":node("Серый водовоз с белой полосой: на боку — «Трест. Подача №4». Бак полон. Шины спущены, но насос цел.",[
  opt("Вернуть Тресту: пусть патруль заберёт.","trust",**{"effects":TK("trust",[CAPS(100),F("trust_warm")])}),
  opt("Отвести воду Кругу колодцев.","circle",**{"effects":TK("circle",[KARMA(2)])}),
  opt("Оставить «Жажде» — за долю.","thirst",**{"effects":TK("thirst",[CAPS(80),KARMA(-2)])}),
  BYE()],[Q("stolen_truck","asked")]),
 "trust":node("Патруль Треста приходит ночью и уводит водовоз. Капитан пишет расписку: «вознаграждение — сто капель».",[BYE("…")]),
 "circle":node("Водовоз уходит по тракту к посёлкам. На каждом хуторе его встречают с вёдрами.",[BYE("…")]),
 "thirst":node("Сизый отсчитывает долю и хлопает по плечу. — Наш человек.",[BYE("…")]),
 "done":node("Место, где стоял водовоз.",[BYE()])})
D['brewery_hatch']=dlg("Спуск в варочную",E(["look"]),{"look":node("Люк, из которого тянет сладким.",[opt("Спуститься.",**{"effects":[GOTO("elevator_brewery","ladder")]}),BYE()])})
D['brewery_up']=dlg("Лестница во двор",E(["look"]),{"look":node("Наверх, во двор.",[opt("Подняться.",**{"effects":[GOTO("elevator_yard","brewery")]}),BYE()])})
DB=lambda how,extra=[]: [F("debtor",how),Q("debtor","done"),XP(150)]+extra
D['sizy']=dlg("Сизый",E(["intro"]),{
 "intro":node("Весёлый человек в красной рубахе раскачивается на стуле. — Сизый! Хозяин «Жажды», «Миража» и всего, что тут плохо лежит. Чем порадуешь?",[
  opt("Ключник в клетке. Сколько он должен?","debt",**{"if":[nf("debtor")]}),
  opt("Кто варит «Мираж»?","brew"),
  opt("Конец «Жажде».","fight",**{"effects":[F("thirst_enemy")]}),
  BYE()]),
 "debt":node("— Двести капель. Воду для больной дочки он брал у меня в долг. — Сизый смеётся. — Ну, «у меня». Мне его продала Гильдия — вместе с распиской. Вот она.",[
  opt("Вот двести капель.","bought",**{"if":[caps(200)],"effects":[CAPS(-200),F("open_cage")]+DB("bought",[F("guild_sold_debtor")])}),
  opt("…","intro")],[Q("debtor","truth")]),
 "bought":node("Сизый бросает ключ от клетки. — С тобой приятно иметь дело. Заходи ещё.",[BYE("…")]),
 "brew":node("— Дед Куб, внизу. Хорошо варит. А из чего — не спрашивай.",[opt("…","intro")],[Q("mirage_brew","asked")]),
 "fight":node("Сизый перестаёт улыбаться. — Ну, раз так…",[BYE("…")])},"portrait_sizy")
D['klyuchnik']=dlg("Ключник",E([fl("open_cage"),"free"],["intro"]),{
 "intro":node("В клетке сидит худой парень в выцветшей рубахе водоноса. — Ключник. Брат Лейки. Брал воду для дочки — долг продали «Жажде». Вытащи меня — Лейка не забудет.",[
  opt("Вскрыть замок клетки.",None,**{"check":chk(skill="lockpick",mod=-10,pass_="picked",fail="stuck")}),
  BYE()],[Q("debtor","asked")]),
 "picked":node("Замок клетки щёлкает. Ключник выскальзывает наружу. — Через стоки, к Лейке. Спасибо.",[opt("…",**{"effects":[F("open_cage")]+DB("freed")})]),
 "stuck":node("Замок не поддаётся.",[BYE()]),
 "free":node("Клетка открыта. — Иду к Лейке, — говорит Ключник.",[opt("…",**{"if":[nf("debtor")],"effects":DB("stormed")}),BYE("Иди.")])},"portrait_klyuchnik")
D['debtor_cage']=dlg("Клетка",E([fl("open_cage"),"open"],["shut"]),{"shut":node("Клетка из арматуры на замке.",[BYE()]),"open":node("Клетка открыта.",[BYE()])})
MB=lambda how,extra=[]: [F("mirage_brew",how),Q("mirage_brew","done"),XP(150)]+extra
D['kub']=dlg("Дед Куб",E(["intro"]),{
 "intro":node("Толстый старик в кожаном фартуке помешивает куб. — Куб. Варю. Не мешай.",[
  opt("Из чего варишь «Мираж»?","what")],[Q("mirage_brew","asked")]),
 "what":node("— Из жёлтых бочек, — Куб кивает на склад. — Порошок со складов Хлебного. Чуток в куб — и голова лёгкая. — Он не видит, что сказал. Порошок — Суховей. Вот почему Мёртвые поля вокруг Элеватора растут.",[
  opt("[Ремонт] Перекрыть клапан и дать кубу закипеть.","blown",**{"if":[sk("repair",40)],"effects":MB("blown")}),
  opt("Бросить зажигательную бутылку в топку.","blown",**{"if":[it("firebomb")],"effects":[T("firebomb")]+MB("blown")}),
  opt("Поставки теперь через меня. Триста капель с каждой партии.","taken",**{"effects":MB("taken",[CAPS(300),KARMA(-3)])}),
  opt("Трест узнает, где варят «Мираж».","trust",**{"effects":MB("trust",[F("trust_warm")])}),
  BYE()],[Q("mirage_brew","truth")]),
 "blown":node("Куб гудит, свистит — и лопается, обдав подвал сладким паром. Варочная мертва. Дед Куб сидит на полу и плачет над своим ремеслом.",[BYE("…")]),
 "taken":node("Куб пожимает плечами. — Мне всё равно, кому. — Он варит дальше.",[BYE("…")]),
 "trust":node("Через три дня патруль Треста накрывает варочную. Куба увозят в Запруду.",[BYE("…")])},"portrait_kub")
D['still']=dlg("Варочный куб",E(["look"]),{"look":node("Медный куб гудит над огнём. Из змеевика капает мутное — «Мираж».",[BYE()])})
D['brew_barrels']=dlg("Жёлтые бочки",E(["look"]),{"look":node("Бочки с надписью «Суховей. Опытная партия». Те же, что на складах Хлебного.",[BYE()],[F("brew_clue")])})

# ================= the Ark =================
AR=lambda how,extra=[]: [F("ark",how),Q("ark","done"),XP(150)]+extra
D['ark_radio']=dlg("Приёмник",E(["look"]),{"look":node("Довоенный приёмник, тщательно спрятанный под мешковиной. Из динамика шипит: «…область пониженного давления… осадков не ожидается…». Это сводки «Шептуна».",[BYE()],[F("ark_radio_seen"),Q("ark","truth")])})
D['oblako']=dlg("Отец Облако",E([fl("ark"),"after"],["intro"]),{
 "intro":node("Высокий старик в бело-голубых одеждах опирается на посох. — Мир тебе, путник. Дождь придёт к тем, кто ждёт. Ты ждёшь?",[
  opt("Приёмник в каюте. Ты слушаешь сводки — и пророчишь по ним.","radio",**{"if":[fl("ark_radio_seen")]}),
  opt("[Восприятие] Ты смотришь на небо, как метеоролог, а не как пророк.","radio",**{"if":[at("per",6)],"effects":[F("ark_radio_seen")]}),
  opt("Жду. И помогу.","believe",**{"effects":AR("believed",[KARMA(1)])}),
  BYE()],[Q("ark","asked")]),
 "radio":node("Отец Облако долго молчит. — Они пришли умирать в пустыню. Я дал им ждать. Ждать — лучше, чем умирать. — Он смотрит на тебя. — Что ты сделаешь?",[
  opt("Скажу паломникам правду.","exposed",**{"effects":AR("exposed",[F("fanatics_angry"),F("ark_left")])}),
  opt("Оставлю как есть.","left",**{"effects":AR("left")}),
  opt("Вот свежие метеосводки с «Шептуна». Пусть твой дождь будет хотя бы вовремя.","rain",**{"if":[it("weather_reports")],"effects":[T("weather_reports")]+AR("rain_came")})]),
 "exposed":node("Ты говоришь паломникам правду у сходней. Одни плачут и уходят. Другие — фанатики — хватаются за копья.",[BYE("…")]),
 "left":node("Отец Облако кивает и возвращается к приёмнику.",[BYE("…")]),
 "rain":node("Отец Облако читает сводки, шевеля губами. — По этим сводкам дождя не будет ещё год, — говорит он. А через неделю над Ковчегом идёт дождь. Не по сводкам. Просто идёт.",[BYE("…")]),
 "believe":node("— Тогда жди вместе с нами. — Облако благословляет тебя.",[BYE("…")]),
 "after":node("— Мир тебе.",[BYE()])},"portrait_oblako")
D['pilgrim_talk']=dlg("Паломник",E(["hi"]),{"hi":node("— Дождь придёт. Отец сказал.",[BYE()])})
D['fanatic']=dlg("Фанатик",E(["hi"]),{"hi":node("Фанатик молча сжимает копьё.",[BYE()])})
D['agnia_mother']=dlg("Мать Агнии",E([fl("stray"),"after"],["intro"]),{
 "intro":node("Женщина с пустой флягой хватает тебя за рукав. — Агния, дочка… Ушла в пустыню ждать дождя одна. Вчера. Найди её!",[
  opt("[Выживание] Следы ведут на запад, к низине. Я найду её сразу.","found",**{"if":[sk("survival",50)],"effects":[F("stray","found"),F("dry_rain_hint"),Q("stray","done"),XP(150)]}),
  opt("Найду. Куда она пошла?","where",**{"effects":[F("stray_asked"),{"type":"dayMark","key":"stray_deadline","in":2},Q("stray","asked")]}),
  BYE()]),
 "where":node("— На запад, к низине у старого русла. Там, говорят, бывает сыро.",[BYE("…")]),
 "found":node("К вечеру ты приводишь Агнию: босую, с мокрым подолом. — Там, в низине, земля влажная, — шепчет она. — Как будто дождь был.",[BYE("…")]),
 "after":node("— Спасибо тебе.",[BYE()])},"portrait_pilgrim")
D['agnia_mother']['nodes']['after']['text']="Мать Агнии смотрит в пустыню и молчит."
D['agnia']=dlg("Агния",E(["hi"]),{"hi":node("— В низине земля мокрая. Я видела. Дождь был — только там.",[BYE()])},"portrait_agnia")

# ================= Хэнк's debt =================
HK=lambda how,extra=[]: [F("hank_debt",how),Q("hank_debt","done"),XP(150)]+extra
D['zasov']=dlg("Засов",E(["intro"]),{
 "intro":node("Старик в старой шинели тюремщика Треста щурится на тебя. — Засов. Был ключником в «Сухом доке». Теперь — никто.",[
  opt("Хэнк сбежал при тебе. Дверь была не заперта.","who",**{"if":[fl("with_hank")]}),
  BYE()]),
 "who":node("Хэнк выходит вперёд. Засов бледнеет. — Я… не запер. Мне велели. Человек с красным сургучом на перчатке: «Оставь дверь — и получишь пенсию». — Он мнёт фуражку. — Сургуч хотел, чтобы ты унёс тубус из Запруды. Своими ногами.",[
  opt("Хэнк, решай ты.","forgive"),
  opt("Шлюз должен это услышать.","given",**{"effects":HK("given",[F("trust_warm")])}),
  opt("Имя. Кто был с сургучом?",None,**{"check":chk(skill="speech",mod=0,pass_="testimony",fail="forgive")})],[Q("hank_debt","truth")]),
 "forgive":node("Хэнк долго смотрит на старика. — Я двадцать лет думал, что мне повезло. — Он кладёт Засову в ладонь каплю. — Живи. Ты тоже был пешкой.",[opt("…",**{"effects":HK("forgiven")})]),
 "given":node("Засова уводят люди Шлюза. Хэнк отворачивается.",[BYE("…")]),
 "testimony":node("— Оттиск, — шепчет Засов. — Он так себя звал. — Хэнк записывает каждое слово, и Засов ставит под показаниями крест. Улика для суда.",[opt("…",**{"effects":HK("testimony",[F("hank_testimony")])})])},"portrait_zasov")
D['comp_timofey']=json.loads(json.dumps(json.load(open('src/content/dialogues/crystal.json'))['comp_shepot']).replace('shepot','timofey'))
ct=D['comp_timofey']; ct['speaker']="Тимофей Книжник"; ct['portrait']="portrait_timofey"
n=ct['nodes']; n['with']['text']="Тимофей закрывает записную книжку. — Слушаю."; n['back']['text']="— Позади. Оттуда лучше видно, что записать."; n['left']['text']="— Вернусь в приют. Книга ждёт."; n['home']['text']="Тимофей пишет в приюте Тишины. — Снова в путь? Я готов."; n['joined']['text']="— Идём. Я буду записывать."
# speakers who leave the map with their outcome flag: the flags go on the last «…» of the node, not on the choice
for did in ('ponomar','kub','zasov'):
    nodes=D[did]['nodes']
    for nid,nd in list(nodes.items()):
        for o in nd['options']:
            if o.get('effects') and o.get('next') and any(e.get('type')=='flag' for e in o['effects']):
                tgt=nodes[o['next']]
                eff=o.pop('effects')
                for t in tgt['options']:
                    if t['text']=='…' and not t.get('next'): t['effects']=t.get('effects',[])+eff
            ch=o.get('check')
            if ch and ch.get('passEffects'):
                tgt=nodes[ch['pass']]
                eff=ch.pop('passEffects')
                for t in tgt['options']:
                    if t['text']=='…' and not t.get('next'): t['effects']=t.get('effects',[])+eff
open('src/content/dialogues/lowland.json','w').write(json.dumps(D,ensure_ascii=False,indent=1)+'\n')

# ================= data =================
QS=json.load(open('src/content/quests.json'))
alt=lambda cond,text: {"if":cond,"journal":text}
def qd(id_, title, asked, done_text, alts, truth=None):
    st=[{"id":"asked","xp":20,"journal":asked}]
    if truth: st.append({"id":"truth","xp":60,"journal":truth})
    st.append({"id":"done","xp":150,"journal":done_text,"alt":[alt([fl(id_,k)],v) for k,v in alts]})
    QS[id_]={"title":title,"stages":st}
qd("lead_flower","Свинцовый цветок","Тимофей Книжник ищет свинцовый цветок — лекарство Полусухих от деревенения.","Лекарство для Полусухих есть.",[("bought","Цветы куплены у Гвоздаря."),("talked","Гвоздарь отдал цветы по-хорошему."),("driven","Хуторяне Свинцового ушли с отравленной земли."),("grown","Цветок растёт в Колючке из семян «Росы-2».")])
qd("silence_raid","Облава","Трест пришёл жечь приют Тишины как «рассадник заразы».","С облавой решено.",[("fought","Облава отбита."),("talked","Капитан Сухоруков ушёл: «очага не обнаружено»."),("moved","Полусухие ушли в Колючку.")])
qd("bell","Колокол Хлебного","В мёртвом Хлебном по ночам звонит колокол.","С колоколом решено.",[("led","Пономарь звонит теперь в приюте Тишины."),("vespers","Пономарь дождался своей вечерни."),("left","Колокол звонит по ночам и зовёт Сухостоев.")])
qd("herd","Стадо","Стадо Сухостоев кружит у хутора Свинцовый.","Стадо ушло от хутора.",[("decoy","Стадо ушло за ложной бочкой."),("burned","Стадо остановлено огнём у изгороди."),("shared","Хутор отдал воду, стадо напилось и ушло.")])
qd("mirage_brew","Кто варит Мираж","«Мираж» варят на Элеваторе.","С варочной «Миража» решено.",[("blown","Варочная взорвана."),("taken","Поставки «Миража» идут через меня."),("trust","Трест накрыл варочную.")],"Сырьё «Миража» — Суховей со складов Хлебного. Потому и растут Мёртвые поля.")
qd("debtor","Должник","В клетке на Элеваторе — Ключник, брат Лейки.","Ключник свободен.",[("bought","Ключник выкуплен у Сизого."),("freed","Ключник сбежал через вскрытую клетку."),("stormed","Ключник свободен: Элеватор взят.")],"Долг Ключника «Жажде» продала Гильдия.")
qd("stolen_truck","Похищенная вода","Во дворе Элеватора — угнанный водовоз Треста.","С водовозом решено.",[("trust","Водовоз вернулся Тресту."),("circle","Вода из водовоза ушла Кругу."),("thirst","Водовоз остался «Жажде», доля — у меня.")])
qd("ark","Ковчег","Отец Облако на Ковчеге обещает дождь.","С Ковчегом решено.",[("exposed","Отец Облако разоблачён."),("left","Отец Облако пророчит дальше."),("believed","Я поверил/а в дождь Отца Облако."),("rain_came","Над Ковчегом пошёл дождь — вне всяких сводок.")],"У Отца Облако в каюте — приёмник со сводками «Шептуна».")
QS['ark']['stages'][-1]['alt'][2]['journal']="Вера в дождь Отца Облако — со мной."
qd("stray","Пропавшая паломница","Агния ушла с Ковчега ждать дождя одна, к низине на западе.","С Агнией решено.",[("found","Агния найдена у влажной низины."),("dead","Агнию нашли поздно.")])
qd("hank_debt","Долг сборщика","Хэнк ищет в Нижнем городе Запруды того, кто не запер его камеру.","С долгом Хэнка решено.",[("forgiven","Хэнк простил Засова."),("given","Засов отдан Шлюзу."),("testimony","Показания Засова: побег Хэнку открыл Оттиск Сургуча.")],"Побег Хэнку открыл Сургуч: тубус должен был уйти из Запруды.")
open('src/content/quests.json','w').write(json.dumps(QS,ensure_ascii=False,indent=1)+'\n')
IT=json.load(open('src/content/items.json'))
IT['lead_bloom']={"name":"Свинцовый цветок","desc":"Сизые головки на серых стеблях. Лекарство Полусухих от деревенения.","icon":"icon_mint_leaf","cat":"quest","value":0}
IT['weather_reports']={"name":"Метеосводки «Шептуна»","desc":"Лента сводок: давление, ветер, влажность над всей Сушью.","icon":"icon_letter","cat":"quest","value":0}
open('src/content/items.json','w').write(json.dumps(IT,ensure_ascii=False,indent=2)+'\n')
C=json.load(open('src/content/creatures.json'))
H=["human"]
C['raid_captain']={"name":"Капитан Сухоруков","sheet":"raid_captain","tags":H,"hp":22,"ap":8,"seq":10,"skill":50,"guns":55,"aim":6,"weapons":["nailgun","club"],"dr":10,"dt":1,"crit":5,"perception":6,"xp":110,"loot":{"nails":8},"fleeAt":0.3}
C['sizy']={"name":"Сизый","sheet":"sizy","tags":H,"hp":26,"ap":8,"seq":11,"skill":55,"guns":55,"aim":6,"weapons":["zipgun","cleaver"],"dr":10,"dt":1,"crit":6,"perception":6,"xp":150,"loot":{"ammo":10,"mirage":2},"fleeAt":0.2}
C['fanatic']={"name":"Фанатик Ковчега","sheet":"fanatic","tags":H,"hp":14,"ap":8,"seq":10,"skill":50,"weapons":["bone_spear"],"dr":0,"crit":5,"perception":5,"xp":40,"fleeAt":0.3}
C['timofey_ally']={"name":"Тимофей Книжник","sheet":"timofey","tags":H,"hp":20,"ap":7,"seq":8,"skill":40,"guns":50,"aim":6,"weapons":["zipgun","knife"],"dr":15,"dt":2,"crit":5,"perception":8,"xp":0,"fleeAt":0,"heal":6}
open('src/content/creatures.json','w').write(table(C))
COMP=json.load(open('src/content/companions.json'))
COMP['timofey']={"name":"Тимофей Книжник","sheet":"timofey","creature":"timofey_ally","dialogue":"comp_timofey","barks":[
 {"map":"khlebnoe_ruins","text":"Хлебное. Здесь пекли на всю Светлую. Я помню запах."},
 {"map":"ark_ship","text":"Приёмник «Звезда-4». Я на таком слушал прогнозы. Дождя они не обещали."},
 {"map":"ruins_library","text":"Библиотека! Двести лет я мечтал сюда вернуться."},
 {"map":"skit_archive","text":"Архив «Росы». Здесь знают, откуда взялось наше деревенение."}]}
open('src/content/companions.json','w').write(table(COMP))
L=json.load(open('src/content/locations.json'))
O=[{"flag":"chapter1_done"}]
for k in ['khlebnoe','silence','elevator','ark']: L[k].pop('chapter',None)
L['khlebnoe'].update({"name":"Мёртвые поля и Хлебное","map":"dead_fields","entry":"south","open":O,"areas":[{"map":"dead_fields","entry":"south","name":"Мёртвые поля","at":[0.5,0.7]},{"map":"khlebnoe_ruins","entry":"south","name":"Руины Хлебного","at":[0.5,0.25]}]})
L['silence'].update({"map":"silence_house","entry":"south","open":O})
L['elevator'].update({"map":"elevator_yard","entry":"south","open":O,"areas":[{"map":"elevator_yard","entry":"south","name":"Двор","at":[0.5,0.7]},{"map":"elevator_floors","entry":"south","name":"Этажи","at":[0.5,0.25]},{"map":"elevator_brewery","entry":"ladder","name":"Варочная","at":[0.2,0.6],"known":[{"flag":"mirage_brew_asked"}]}]})
L['ark'].update({"map":"ark_camp","entry":"south","open":O,"areas":[{"map":"ark_camp","entry":"south","name":"Лагерь паломников","at":[0.5,0.7]},{"map":"ark_ship","entry":"south","name":"Ковчег","at":[0.5,0.25]}]})
L['stray_spot']={"name":"Влажная низина","cell":[22,76],"secret":True,"open":[{"flag":"stray_asked"},{"notFlag":"stray"}],"reach":[
 {"if":[{"notFlag":"stray"},{"notFlag":"day"}],"effects":[F("stray","found"),F("dry_rain_hint"),Q("stray","done"),XP(150)],"log":"В низине земля влажная, будто здесь был дождь. Агния сидит у лужицы и смотрит в небо. Она жива."},
 {"if":[{"notFlag":"stray"},{"flag":"day","ltFlag":"stray_deadline"}],"effects":[F("stray","found"),F("dry_rain_hint"),Q("stray","done"),XP(150)],"log":"В низине земля влажная, будто здесь был дождь. Агния сидит у лужицы и смотрит в небо. Она жива."},
 {"if":[{"notFlag":"stray"},{"flag":"day","gteFlag":"stray_deadline"}],"effects":[F("stray","dead"),Q("stray","done")],"log":"В низине земля влажная. Агния лежит у пересохшей лужицы. Поздно."}]}
json.dump(L,open('src/content/locations.json','w'),ensure_ascii=False,indent=2)
print('ok')
