# Stage B content generator: Chapter VIII «Костяной круг». Run from the repo root; idempotent.
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
def KEY(way, extra=[]): return [F("key_way",way),F("key_whole"),G("key_half"),Q("bones","printer"),XP(250)]+extra
IN=lambda way: [F("circle_way",way),F("bones_in"),F("open_bone_gate_a"),F("open_bone_gate_b"),Q("bones","key"),XP(100)]
PRINTER=lambda way: [F("printer_known"),F("printer_way",way)]

# ================= the Костяной круг =================
D['bone_gate']=dlg("Ворота из рёбер",E([fl("bones_in"),"open"],["shut"]),{"shut":node("Рёбра быков в рост человека, связанные жилами. Без слова стражи не откроются.",[BYE()]),"open":node("Ворота из рёбер открыты.",[BYE()])})
D['bone_guard']=dlg("Страж ворот",E([fl("bones_in"),"inside"],["intro"]),{
 "intro":node("Сухарь с костяным копьём перекрывает проход. — Круг — не для водяных. Кто ты и зачем пришёл сюда, где пьют раз в день?",[
  opt("Шёпот со мной. Спроси её.","in_shepot",**{"if":[fl("with_shepot")],"effects":IN("shepot")}),
  opt("Шёпот знает меня с арены Соли. Её брат свободен.","in_shepot",**{"if":[fl("last_bout","spared")],"effects":IN("shepot")}),
  opt("Шёпот знает меня с арены Соли. Её брат свободен.","in_shepot",**{"if":[fl("last_bout","bought")],"effects":IN("shepot")}),
  opt("Шёпот знает меня с арены Соли. Её брат свободен.","in_shepot",**{"if":[fl("last_bout","talked")],"effects":IN("shepot")}),
  opt("Кремень помнит меня по Колючке.","in_kremen",**{"if":[fl("raid_outcome","trapped")],"effects":IN("kremen")}),
  opt("Кремень помнит меня по Колючке.","in_kremen",**{"if":[fl("raid_outcome","parley")],"effects":IN("kremen")}),
  opt("Ласка из Колючки ушла к вам. Спроси её обо мне.","in_kremen",**{"if":[fl("laska","left")],"effects":IN("kremen")}),
  opt("[Выносливость] Я иду на сухую неделю.","in_trial",**{"if":[at("end",6)],"effects":IN("trial")+[F("trial_candidate")]}),
  opt("[Выживание] Я иду на сухую неделю. Одна фляга — мне хватит.","in_trial",**{"if":[sk("survival",50)],"effects":IN("trial")+[F("trial_candidate")]}),
  opt("Пустите — или пройду сам.","force",**{"effects":[F("circle_forced")]}),
  BYE()]),
 "in_shepot":node("Страж свистит. Из-за шатров отвечают таким же свистом. — Шёпот сказала: свой. Проходи. Мать у круга.",[BYE("…")]),
 "in_kremen":node("— Кремень говорил о чужаке из Колючки. — Страж опускает копьё. — Проходи. Но помни: здесь Кремень — не главный.",[BYE("…")]),
 "in_trial":node("Страж смеётся — коротко, без злобы. — Неделя на одной фляге? Посмотрим. Проходи. Камень — на тропе, над лагерем.",[BYE("…")]),
 "force":node("— Значит, по-плохому. — Страж свистит, второй разворачивается к тебе.",[BYE("…")]),
 "inside":node("— Проходи. Мать у круга.",[BYE()])},"portrait_suhar")
D['suhar_warrior']=dlg("Воин Сухарей",E(["hi"]),{"hi":node("— Сухое не гниёт. — Воин смотрит на твою флягу.",[
 opt("Кто роет землю у круга?",None,**{"if":[fl("ancestors_asked"),nf("ancestors_truth")],"check":chk(skill="speech",mod=0,pass_="truth",fail="no",pe=[F("ancestors_truth"),Q("ancestors","truth")])}),BYE()]),
 "truth":node("Воин оглядывается. — Ночью. Подбитые сапоги — у нас такие только у Кремня.",[BYE()]),
 "no":node("— Спроси Мать.",[BYE()])},"portrait_suhar")
D['tresh']=dlg("Мать Трещина",E([fl("key_whole"),"after"],["intro"]),{
 "intro":node("Старуха в бусах из позвонков сидит у круга костей и не встаёт. — Трещина. Мать этого круга. — Её глаза останавливаются на тубусе. — Знаю, что ты носишь. Половина знает тебя давно — она у меня на шее.",[
  opt("Вторая половина ключа. Она мне нужна.","ask"),
  opt("Почему Сухари — охрана плотины?","lore"),
  opt("В круге всё спокойно?","spy",**{"if":[nf("traitor_asked")]}),
  BYE()]),
 "lore":node("— Наши деды носили каски Водоуправления и стерегли Заслон. Смотритель дал им половину ключа и клятву: не отдать воду войне. Потом пришёл Огонь. Клятва осталась, а слово «война» забылось. Стали говорить «никому не отдать». — Она трогает шнурок. — Я в этом сомневаюсь. Давно.",[opt("…","intro")]),
 "spy":node("— Кто-то носит вести из круга. Трест знает, где мы пьём; Гильдия знает, когда мы спим. — Трещина плюёт в пыль. — Найдёшь — круг запомнит.",[opt("…","intro")],[F("traitor_asked"),Q("traitor","asked")]),
 "ask":node("— Клятва: не отдать воду войне. Покажи, что ты — не война.",[
  opt("Пройду сухую неделю.","trial_go",**{"if":[nf("dry_week")]}),
  opt("Сухая неделя пройдена.","give_trial",**{"if":[fl("dry_week","passed")],"effects":KEY("trial")}),
  opt("Вот дневник Вереса. Клятва — «не отдать воду войне», а не «никому».",None,**{"if":[it("veres_diary")],"check":chk(skill="speech",mod=0,pass_="give_diary",fail="doubt",pe=KEY("diary"))}),
  opt("Отдай ключ — или возьму сам.","threat"),
  BYE("Подумаю.")]),
 "trial_go":node("— Камень на тропе. Одна фляга. Вернёшься — поговорим.",[BYE("…")],[F("dry_week_asked"),Q("dry_week","asked")]),
 "give_trial":node("Трещина снимает шнурок с шеи и вкладывает половину пластины тебе в ладонь. — Неделю ты не пил чужой воды. Значит, и чужую войну не принесёшь. Береги.",[BYE("…")]),
 "give_diary":node("Трещина читает долго, шевеля губами. Потом закрывает тетрадь. — «Тем, кто пьёт ниже по течению». Не «никому». — Она снимает шнурок. — Двести лет мы стерегли не то. Бери.",[BYE("…")]),
 "doubt":node("— Бумага. — Трещина отдаёт тетрадь. — Сухие не верят бумаге. Приходи, когда научишься говорить.",[BYE()]),
 "threat":node("Трещина медленно поднимается, опираясь на посох. Кремень у шатра уже держит копьё. — Попробуй.",[opt("Возьму.","fight",**{"effects":[F("bones_fight")]}),opt("Нет. Забудь.","intro")]),
 "fight":node("Круг смыкается. Воины встают у костей.",[BYE("…")]),
 "after":node("— Ключ у тебя. Не сделай из воды войну.",[BYE()])},"portrait_tresh")
AN=lambda how,extra=[]: [F("ancestors",how),Q("ancestors","done"),XP(120)]+extra
D['kremen_c']=dlg("Кремень",E([fl("ancestors"),"after"],[fl("ancestors_truth"),"confront"],["intro"]),{
 "intro":node("Кремень, военный вождь Сухарей, точит наконечник. — Опять ты. В Колючке ты мешал/а мне.",[BYE()]),
 "confront":node("— Ты роешь у круга по ночам, — говоришь ты. Кремень замирает. — Карта водоводов, — цедит он. — Охрана плотины спрятала её с костями. С ней мы ударим по Тресту первыми, пока он не ударил по нам.",[
  opt("Расскажу Матери.","reported",**{"effects":AN("reported",[F("kremen_disgraced")])}),
  opt("Помогу искать. Трест это заслужил.","helped",**{"effects":AN("helped",[F("kremen_strike")])}),
  opt("Отдай карту мне — или Мать узнает.",None,**{"check":chk(skill="speech",mod=-10,pass_="taken",fail="refuse",pe=AN("taken",[G("aqueduct_map")]))}),
  BYE()]),
 "reported":node("Трещина слушает молча. Вечером Кремня нет у костра: он сидит один на краю каньона. Опала.",[BYE("…")]),
 "helped":node("Под третьим черепом — свёрток в промасленной коже. Кремень улыбается, впервые при тебе. — В последний день Трест узнает, кто здесь охрана.",[BYE("…")]),
 "taken":node("Кремень швыряет свёрток тебе под ноги. — Бери. Но запомни: ты отнял у Сухарей удар.",[BYE("…")]),
 "refuse":node("— Иди, жалуйся. — Кремень отворачивается.",[BYE()]),
 "after":node("Кремень молчит.",[BYE()])},"portrait_kremen")
D['kremen_c']['nodes']['intro']['text']="Кремень, военный вождь Сухарей, точит наконечник. — Опять ты. В Колючке ты стоял поперёк моей дороги. Здесь не стой."
D['kremen_c']['nodes']['intro']['text']="Кремень, военный вождь Сухарей, точит наконечник. — Опять ты. В Колючке наши дороги уже пересекались. Здесь — не пересекай."
D['dug_bones']=dlg("Разрытая земля",E([fl("ancestors_truth"),"known"],["look"]),{
 "look":node("Кости у круга сдвинуты, земля разрыта и наспех засыпана. Кто-то копал ночью.",[
  opt("[Восприятие] Следы подбитых сапог. Такие — у Кремня.","found",**{"if":[at("per",6)],"effects":[F("ancestors_truth"),Q("ancestors","truth")]}),
  BYE()],[F("ancestors_asked"),Q("ancestors","asked")]),
 "found":node("Подбитые сапоги и глубокая яма под третьим черепом. Кремень что-то ищет у предков.",[BYE()]),
 "known":node("Разрытая земля под третьим черепом.",[BYE()])})
TR=lambda how,extra=[]: [F("traitor",how),Q("traitor","done"),G("printer_letter"),F("seal_mark_11"),XP(150)]+PRINTER("traitor")+extra
D['traitor_tent']=dlg("Шатёр Щебня",E([fl("traitor_found"),"known"],["look"]),{
 "look":node("Шатёр как шатёр: шкуры, копьё, фляга. У входа — пятнышко.",[
  opt("[Восприятие] Красный воск на шнуровке. Сухари не пользуются сургучом.","found",**{"if":[at("per",7)],"effects":[F("traitor_found"),Q("traitor","truth")]}),
  opt("Шёпот, посмотри.","shepot",**{"if":[fl("with_shepot")],"effects":[F("traitor_found"),Q("traitor","truth")]}),
  BYE()],[Q("traitor","asked")]),
 "found":node("Капля красного сургуча с оттиском руки, держащей печать. Щебень — оттиск Сургуча.",[BYE()]),
 "shepot":node("Шёпот нюхает шнуровку и поднимает глаза. — Сургуч. Щебень носит вести не Тресту. Тем, кто ставит печати.",[BYE()]),
 "known":node("Шатёр Щебня. Красный воск на шнуровке.",[BYE()])})
D['shcheben']=dlg("Щебень",E([fl("traitor_found"),"caught"],["intro"]),{
 "intro":node("Тихий сухарь чинит копьё и не поднимает глаз. — Щебень. Чего тебе?",[BYE()]),
 "caught":node("— Красный воск на твоём шатре, — говоришь ты. Щебень бледнеет и вдруг вытаскивает из-за пазухи сложенное письмо. — Возьми. Только не круг. Круг меня… — Письмо подписано: «Е. Штемпель». Нотариус из Запруды.",[
  opt("Круг решит, что с тобой делать.","exposed",**{"effects":TR("exposed")}),
  opt("Беги. И отнеси хозяевам: ключ всё ещё у Трещины.","released",**{"effects":TR("released",[F("sealwax_misled")])}),
  opt("Здесь и кончишь.","fight",**{"effects":[F("traitor_fight")]})]),
 "exposed":node("Круг судит до заката. Щебня уводят в каньон, без воды. Трещина кивает тебе: круг запомнил.",[BYE("…")]),
 "released":node("Щебень уходит той же ночью. Сургуч получит ложь — и будет ждать не там.",[BYE("…")]),
 "fight":node("Щебень бросается с ножом.",[BYE("…")])},"portrait_shcheben")
DW=lambda how,extra=[]: [F("dry_week",how),Q("dry_week","done")]+extra
D['week_stone']=dlg("Камень испытаний",E([fl("dry_week"),"done"],["look"]),{
 "look":node("Плоский камень, отполированный сотнями испытуемых. Рядом — холодное кострище. Неделя, одна фляга, и никуда не уходить.",[
  opt("[Выживание] Сесть у камня. Тень, роса на рассвете, ни шага лишнего.","day3",**{"if":[sk("survival",60)]}),
  opt("[Выносливость] Сесть у камня и терпеть.","day3",**{"if":[at("end",7)]}),
  opt("Сесть у камня и терпеть.",None,**{"check":chk(attr="end",mod=-10,pass_="day3",fail="collapse")}),
  BYE()]),
 "collapse":node("На четвёртый день мир плывёт. Ты приходишь в себя у кострища, и губы в крови. Попробовать снова — позже.",[BYE()],[{"type":"hp","amount":-10}]),
 "day3":node("На третий день по тропе спускается человек в белом, с бочонком на спине. — «Мираж», — представляется он. — Вода. Холодная. Недорого. Никто не узнает.",[
  opt("Купить воды.","bought",**{"effects":DW("bought")}),
  opt("Уходи.","passed",**{"effects":DW("passed",[XP(150)])}),
  opt("Кто тебя прислал?",None,**{"check":chk(skill="speech",mod=-10,pass_="sent",fail="passed",pe=DW("passed",[F("mirage_sent"),XP(180)]),fe=DW("passed",[XP(150)]))})]),
 "bought":node("Вода холодная. Вкусная. Снизу, из лагеря, доносится смех: Сухари всё видели. Неделя не засчитана.",[BYE("…")]),
 "passed":node("«Мираж» пожимает плечами и уходит вверх по тропе. Ещё четыре дня. Потом за тобой приходят двое с костью в руках — знак: неделя засчитана.",[BYE("…")]),
 "sent":node("«Мираж» мнётся. — Кремень послал. Проверить, не трус ли чужак. — Он уходит, оглядываясь. Неделю засчитывают — и над Кремнём смеются у костра.",[BYE("…")]),
 "done":node("Камень испытаний.",[BYE()])})
D['cave_crawl']=dlg("Лаз в скале",E(["look"]),{"look":node("Узкий лаз уходит в скалу. Изнутри тянет холодом и дымом.",[opt("Пролезть внутрь.",**{"effects":[GOTO("oath_cave","crawl")]}),BYE()])})
D['cave_crawl_back']=dlg("Лаз наружу",E(["look"]),{"look":node("Лаз выводит на тропу.",[opt("Выбраться.",**{"effects":[GOTO("bone_trail","crawl")]}),BYE()])})
D['oath_mural']=dlg("Роспись",E(["look"]),{"look":node("Охрой по камню: плотина, люди в касках, рука над водой. Подпись почти стёрта: «…не отдать войне. Охрана Заслона, смена 4».",[BYE()])})
D['key_niche']=dlg("Ниша клятвы",E([fl("key_whole"),"empty"],["look"]),{
 "look":node("Ниша в скале, костяной ларец. Ночью Трещина кладёт сюда шнурок с половиной пластины — сейчас как раз ночь.",[
  opt("Вынуть пластину тихо.",None,**{"check":chk(skill="sneak",mod=-10,pass_="stolen",fail="caught",pe=KEY("stolen",[F("bones_suspicious")]))}),
  opt("Вскрыть ларец отмычкой.",None,**{"check":chk(skill="lockpick",mod=-10,pass_="stolen",fail="caught",pe=KEY("stolen",[F("bones_suspicious")]))}),
  BYE()]),
 "stolen":node("Пластина холодная и тяжелее, чем кажется. Половина кода — у тебя в руке. Пора уходить, пока круг спит.",[BYE("…")]),
 "caught":node("Ларец щёлкает слишком громко. Где-то в темноте кто-то садится на шкурах. Ты замираешь — и тишина. Второй раз так не повезёт.",[BYE()]),
 "empty":node("Пустая ниша.",[BYE()])})

# ================= the ruins =================
CH=lambda how,extra=[]: [F("city_hall",how),Q("city_hall","done"),XP(120)]+extra
D['land_registry']=dlg("Земельные книги",E([fl("city_hall"),"done"],["look"]),{
 "look":node("Толстые книги в зелёном коленкоре: «Реестр земель и вод бассейна Светлой». Ты листаешь: колодец Ржавый — «собственность посёлка», Колючка — «собственность посёлка». Трест упомянут один раз: как подрядчик по ремонту.",[
  opt("Забрать книги.","taken",**{"effects":CH("taken",[G("land_books")])}),
  opt("[Наука] Переписать заверенную выписку.","copied",**{"if":[sk("science",40)],"effects":CH("copied",[G("land_books")])}),
  opt("Оставить на месте. Скажу Бригаде — пусть хранят.","brigade",**{"effects":CH("brigade",[F("land_books_brigade")])}),
  BYE()],[Q("city_hall","asked")]),
 "taken":node("Книги тяжёлые. Но с ними на суде Трест будет оправдываться, а не судить.",[BYE("…")]),
 "copied":node("Выписка с номерами страниц, печатью мэрии и твоей подписью. Книги — на полке, где их двести лет никто не трогал.",[BYE("…")]),
 "brigade":node("Бригада умеет хранить. Когда понадобятся книги — они будут.",[BYE("…")]),
 "done":node("Полка земельных книг.",[BYE()])})
DR=[F("draisine","built"),Q("draisine","done"),XP(120)]
D['draisine']=dlg("Дрезина",E([fl("draisine"),"go"],["look"]),{
 "look":node("Ржавая дрезина на путях: рычаг, колёса, рама. На раме выбито клеймо: «Литерный». Чей-то довоенный поезд.",[
  opt("[Ремонт] Перебрать колёса и рычаг.","built",**{"if":[sk("repair",60)],"effects":DR}),
  opt("Лёля, оживим?","built",**{"if":[fl("with_lelya")],"effects":DR}),
  opt("Купить детали у кладовщика (300 капель).","built",**{"if":[caps(300)],"effects":[CAPS(-300)]+DR}),
  BYE()],[Q("draisine","asked")]),
 "built":node("Рычаг ходит туго, но ходит. По старым рельсам — до руин Светлоречья и до «Ворот».",[opt("…","go")]),
 "go":node("Дрезина стоит на путях.",[
  opt("В руины Светлоречья.",**{"effects":[GOTO("ruins_streets","rail")]}),
  opt("К «Воротам».",**{"effects":[GOTO("gates_post","rail")]}),
  BYE()])})
D['draisine_station']=dlg("Дрезина",E([fl("draisine"),"go"],["none"]),{
 "none":node("Рельсы уходят к Депо. Дрезины нет: её надо собрать в Депо.",[BYE()]),
 "go":node("Дрезина стоит на путях.",[
  opt("В Депо.",**{"effects":[GOTO("depot_yard","rail")]}),
  opt("В руины Светлоречья.",**{"effects":[GOTO("ruins_streets","rail")]}),
  opt("К «Воротам».",**{"effects":[GOTO("gates_post","rail")]}),
  BYE()])})
D['cellar_hatch']=dlg("Спуск в подвалы",E([fl("hostage"),"voices"],["look"]),{
 "look":node("Люк в мостовой, лестница во тьму.",[opt("Спуститься.",**{"effects":[GOTO("ruins_cellar","ladder")]}),BYE()]),
 "voices":node("Из люка — голоса и запах горячего сургуча.",[opt("Спуститься.",**{"effects":[GOTO("ruins_cellar","ladder")]}),BYE()])})
D['cellar_up']=dlg("Лестница наверх",E(["look"]),{"look":node("Наверх, на улицы.",[opt("Подняться.",**{"effects":[GOTO("ruins_streets","cellar")]}),BYE()])})
D['wax_table']=dlg("Стол с печатями",E(["look"]),{"look":node("Сургуч, спиртовка, оттиски на бумаге — рука, держащая печать. Набор для чужих подписей.",[BYE()])})
D['sealwax_agent']=dlg("Человек Сургуча",E(["hi"]),{"hi":node("— Говори с ним, не со мной.",[BYE()])})
D['hostage_lelya']=dlg("Лёля Реле",E(["hi"]),{"hi":node("Лёля привязана к опоре, во рту кляп, но глаза злые и живые. Она мотает головой: не отдавай.",[BYE()])},"portrait_lelya")
D['hostage_marta']=dlg("Марта",E(["hi"]),{"hi":node("Марта сидит у опоры, руки связаны. — Не отдавай им ничего, — говорит она тихо. — Колодец выстоял без меня — выстоит и сейчас.",[BYE()])},"portrait_marta")
MS=lambda how,extra=[]: [F("museum",how),Q("museum","done"),G("watcher_rod"),XP(150)]+extra
D['curator']=dlg("Хранитель-4",E([fl("museum"),"after"],["intro"]),{
 "intro":node("Человекоподобный автомат в синей форме поворачивает голову с тихим щелчком. — Санитарный день. Музей Водоуправления закрыт для посещения. Экспонаты не выдаются. Санитарный день. — Календарь на его груди показывает дату двухсотлетней давности.",[
  opt("Мы — экскурсия. Записаны на сегодня.",None,**{"check":chk(skill="speech",mod=-10,pass_="tour",fail="closed",pe=MS("tour"))}),
  opt("[Ремонт] Открыть панель и перевести календарь.","reprogrammed",**{"if":[sk("repair",60)],"effects":MS("reprogrammed")}),
  opt("[Наука] Сменить расписание через порт на спине.","reprogrammed",**{"if":[sk("science",60)],"effects":MS("reprogrammed")}),
  opt("Отойди от витрины.","fight",**{"effects":[F("museum_fight")]}),
  BYE()],[Q("museum","asked")]),
 "tour":node("— Экскурсия… — Автомат щёлкает. — Экскурсия записана. Экспонат номер один: Жезл Смотрителя. Передаётся экскурсоводу для показа. — Он открывает витрину и вкладывает жезл тебе в руки. — Верните после санитарного дня.",[BYE("…")]),
 "reprogrammed":node("Календарь на груди Хранителя крутится, щёлкает и останавливается на сегодняшнем дне. — Санитарный день окончен. — Автомат открывает витрину и отходит. — Добро пожаловать.",[BYE("…")]),
 "closed":node("— Экскурсии по записи. Санитарный день.",[BYE()]),
 "fight":node("— Нарушение режима. — Хранитель-4 поднимает руки.",[BYE("…")]),
 "after":node("— Добро пожаловать в музей Водоуправления.",[BYE()])},"portrait_curator")
D['rod_case']=dlg("Витрина «Жезл Смотрителя»",E([fl("museum"),"empty"],["look"]),{
 "look":node("За стеклом на бархате — жезл из воронёной стали с латунным набалдашником в виде капли. Табличка: «Жезл Смотрителя водохранилища Глубокое. Церемониальный ключ пульта».",[
  opt("Вскрыть витрину, пока Хранитель смотрит в другую сторону.",None,**{"check":chk(skill="lockpick",mod=-15,pass_="picked",fail="alarm",pe=MS("picked"),fe=[F("museum_fight")])}),
  BYE()]),
 "picked":node("Стекло отходит без звука. Жезл ложится в руку — тяжёлый, тёплый от солнца в окне.",[BYE("…")]),
 "alarm":node("Замок визжит. Хранитель-4 разворачивается: — Нарушение режима.",[BYE("…")]),
 "empty":node("Пустая витрина.",[BYE()])})
D['museum_case']=dlg("Витрина",E(["look"]),{"look":node("Каска охраны Заслона, план плотины, медаль «За воду». Под стеклом — пыль двухсот лет.",[BYE()])})
D['card_catalog']=dlg("Карточный каталог",E(["look"]),{"look":node("Карточки по алфавиту. «Суховей, агент — см. Отчёт НИИ „Роса“, зал 3». Кто-то вынул карточку и вставил обратно вверх ногами.",[BYE()])})
LB=lambda how,extra=[]: [F("library",how),Q("library","done"),XP(100)]+extra
D['suhovey_book']=dlg("Раскрытая книга",E([fl("library"),"done"],["look"]),{
 "look":node("«Агент „Суховей“. Отчёт НИИ „Роса“». Страницы с 40-й по 56-ю вырваны аккуратно, по линейке. На полях последней уцелевшей — капля красного сургуча с оттиском руки и правка мелким почерком: «Изъять. Е. Ш.».",[
  opt("Почерк — как в реестре Нотариуса в Запруде.","margin",**{"if":[fl("mandate_read")],"effects":PRINTER("library")}),
  opt("[Восприятие] Этот почерк с завитком на «Ш» — видел его на заверенных бумагах.","margin",**{"if":[at("per",8)],"effects":PRINTER("library")}),
  opt("Чей это почерк?","plain")],[F("seal_mark_10"),Q("library","asked")]),
 "margin":node("Е. Ш. — Евстигней Штемпель, нотариус. Тот, кто заверял правду, вырвал её из книги. Шестой Печатник Сургуча.",[opt("Забрать книгу.","taken",**{"effects":LB("taken",[G("suhovey_book")])}),opt("Оставить.","left",**{"effects":LB("left")})]),
 "plain":node("Почерк ничего не говорит. Только инициалы: «Е. Ш.».",[opt("Забрать книгу.","taken",**{"effects":LB("taken",[G("suhovey_book")])}),opt("Оставить.","left",**{"effects":LB("left")})]),
 "taken":node("Книга без страниц тоже улика.",[BYE("…")]),
 "left":node("Книга остаётся на столе.",[BYE("…")]),
 "done":node("Книга о Суховее.",[BYE()])})
PS=lambda how,extra=[]: [F("plate_scheme",how),Q("plate_scheme","done"),F("manual_release"),XP(150)]+extra
D['drawings_cabinet']=dlg("Шкаф чертежей",E([fl("plate_scheme"),"done"],[fl("cabinet_open"),"open"],["look"]),{
 "look":node("Стальной шкаф, на дверце: «Заслон. Затворы. Секретно».",[
  opt("Вскрыть замок.",None,**{"check":chk(skill="lockpick",mod=-10,pass_="open",fail="stuck",pe=[F("cabinet_open")])}),
  opt("[Наука] Подобрать код по схеме на дверце.","open",**{"if":[sk("science",50)],"effects":[F("cabinet_open")]}),
  BYE()],[Q("plate_scheme","asked")]),
 "stuck":node("Замок не поддаётся.",[BYE()]),
 "open":node("Чертёж затворов Заслона, синька на кальке. На полях — рука Вереса: «Ручной сброс. Третий ярус. Без ключа — но и без возврата: вода уйдёт вся». Плотину можно открыть и без Мандата.",[
  opt("Отдать Лёле. Это её чертёж.","lelya",**{"if":[fl("with_lelya")],"effects":PS("lelya")}),
  opt("Оставить себе.","kept",**{"effects":PS("kept",[G("gate_scheme")])}),
  opt("Сжечь. Никто не должен открыть плотину так.","burned",**{"effects":PS("burned")})]),
 "lelya":node("Лёля держит чертёж двумя руками, как живое. — Ручной сброс… Он знал, что ключ могут украсть. — Она прячет кальку за пазуху. — Никому. Даже Сверлу.",[BYE("…")]),
 "kept":node("Калька сложена вчетверо и лежит в мешке рядом с тубусом.",[BYE("…")]),
 "burned":node("Калька горит быстро. Пепел оседает на пол архива.",[BYE("…")]),
 "done":node("Пустой шкаф.",[BYE()])})

# ---- the kidnapper ----
FREE=[F("lelya_taken",False),F("marta_taken",False)]
END=[F("mandate_known"),F("chapter8_done"),Q("bones","done"),XP(300)]
def kid(speaker, intro, quiet):
    def res(way, node_id, extra=[]):
        return [opt_ for opt_ in []]
    def variants(text, node, way, conds=[], effects_pre=[]):
        # the kidnapper and his men leave the map once the hostage is free: the flags go on the last «…», not before
        out=[]
        for known in (True, False):
            c=conds+[fl("printer_known") if known else nf("printer_known")]
            out.append(opt(text,node+("" if known else "_name"),**{"if":c,"effects":effects_pre}))
        return out
    def fin(way, known):
        return [opt("…",**{"effects":[F("hostage_way",way)]+FREE+([] if known else PRINTER("scribe"))+END})]
    nodes={
     "intro":node(intro,
      (variants("Вот тубус. Бери и отпусти.","quiet","fake",[it("fake_mandate"),fl("scribe_outcome","exposed")],[T("fake_mandate")]) if quiet else [])+
      variants("Вот тубус. Бери и отпусти.","fake","fake",[it("fake_mandate")]+([nf("scribe_outcome")] if quiet else []),[T("fake_mandate")])+
      (variants("Вот тубус. Бери и отпусти.","fake","fake",[it("fake_mandate"),fl("scribe_outcome","copied")],[T("fake_mandate")])+variants("Вот тубус. Бери и отпусти.","fake","fake",[it("fake_mandate"),fl("scribe_outcome","followed")],[T("fake_mandate")])+variants("Вот тубус. Бери и отпусти.","fake","fake",[it("fake_mandate"),fl("scribe_outcome","sold")],[T("fake_mandate")]) if quiet else [])+
      variants("Пятьсот капель — и разойдёмся.","paid","bargained",[caps(500)],[CAPS(-500)])+
      [opt("Нотариус Штемпель уже назван. Тронешь заложника — и Сургучу конец.",None,**{"if":[fl("printer_known")],"check":chk(skill="speech",mod=0,pass_="talked",fail="refuse")}),
       opt("Отпусти — или заберу силой.","fight",**{"effects":[F("cellar_fight")]}),
       BYE("Подумаю.")]),
     "quiet":node("Писарь берёт тубус, смотрит в лупу — и долго молчит. Потом кивает: — Подлинник. — И шёпотом, не глядя на тебя: — Я помню, как ты меня отпустил/а у Трёх столбов. — Он режет верёвки.",fin("fake",True)),
     "quiet_name":node("Писарь берёт тубус, смотрит в лупу — и долго молчит. Потом кивает своим: — Подлинник. — И шёпотом, не глядя на тебя: — Нотариус. Штемпель. Это он ставит печати. — Он режет верёвки.",fin("fake",False)),
     "fake":node("Тубус ходит по рукам, под лупу, на свет. — Подлинник, — говорит наконец старший. Верёвки режут. Люди Сургуча уходят вверх по лестнице с подделкой.",fin("fake",True)),
     "fake_name":node("Тубус ходит по рукам, под лупу, на свет. — Подлинник. Штемпель будет доволен, — говорит старший — и осекается. Верёвки режут. Люди Сургуча уходят вверх по лестнице с подделкой; имя хозяина остаётся с тобой.",fin("fake",False)),
     "paid":node("Капли пересчитывают дважды. — Сургуч не торгует людьми. Только бумагой. — Верёвки режут.",fin("bargained",True)),
     "paid_name":node("Капли пересчитывают дважды. — Штемпель за это голову снимет, — ворчит старший, пряча кошель, и осекается. Верёвки режут.",fin("bargained",False)),
     "talked":node("Повисает долгая тишина. Потом старший машет рукой. — Режьте. Печатнику сейчас не до заложников.",fin("bargained",True)),
     "refuse":node("— Слова. — Агенты кладут руки на оружие.",[BYE()]),
     "fight":node("Агенты Сургуча выхватывают оружие.",[BYE("…")])}
    nodes["quiet"]["text"]="Писарь берёт тубус, смотрит в лупу — и долго молчит. Потом кивает своим: — Подлинник. — И шёпотом, не глядя на тебя: — У Трёх столбов меня отпустили живым. Долг платежом. — Он режет верёвки."
    nodes["quiet_name"]["text"]="Писарь берёт тубус, смотрит в лупу — и долго молчит. Потом кивает своим: — Подлинник. — И шёпотом, не глядя на тебя: — У Трёх столбов меня отпустили живым. Долг платежом: нотариус Штемпель. Это он ставит печати. — Он режет верёвки."
    return dlg(speaker,E(["intro"]),nodes,"portrait_pisar" if quiet else "portrait_ottisk")
D['pisar_hideout']=kid("Писарь","Писарь сидит за столом с печатями, как тогда у Трёх столбов, только без улыбки. — Бумага без печати — просто бумага, говорил я. Теперь у тебя полный тубус, а у меня — человек у опоры. Меняемся?",True)
D['ottisk_hideout']=kid("Оттиск","Человек в тёмном пальто и красном шарфе встаёт из-за стола. — Оттиск. Писарь был моим напарником — пока ты его не встретил/а у Трёх столбов. Тубус — за человека у опоры. Без глупостей.",False)
D['ottisk_hideout']['nodes']['intro']['text']="Человек в тёмном пальто и красном шарфе встаёт из-за стола. — Оттиск. Писарь был моим напарником, пока не лёг у Трёх столбов. Тубус — за человека у опоры. Без глупостей."

open('src/content/dialogues/bones.json','w').write(json.dumps(D,ensure_ascii=False,indent=1)+'\n')

# ================= data =================
QS=json.load(open('src/content/quests.json'))
alt=lambda cond,text: {"if":cond,"journal":text}
QS['bones']={"title":"Костяной круг","stages":[
 {"id":"canyon","xp":30,"journal":"Костяной круг — каньон Сухарей, потомков охраны плотины. Чужих сюда не пускают: нужен тот, кто поручится, или испытание."},
 {"id":"key","xp":80,"journal":"Я в Костяном круге. Вторая половина ключа — на шее у Матери Трещины."},
 {"id":"printer","xp":100,"journal":"Обе половины ключа в тубусе. Осталось понять, кто стоит за Сургучом, — и ждать удара: Сургуч знает, что Мандат полон."},
 {"id":"hostage","xp":100,"journal":"Сургуч взял заложника. Записка под красным сургучом зовёт в подвалы Светлоречья: тубус в обмен."},
 {"id":"done","xp":300,"journal":"Заложник свободен, Печатник назван. Все знают, что Мандат полон. Впереди — Заслон. Глава VIII окончена.","alt":[alt([fl("hostage_way","stormed")],"Подвалы взяты штурмом, заложник свободен, Печатник назван. Все знают, что Мандат полон. Впереди — Заслон. Глава VIII окончена."),alt([fl("hostage_way","fake")],"Сургуч унёс подделку, заложник свободен, Печатник назван. Все знают, что Мандат полон. Впереди — Заслон. Глава VIII окончена.")]}]}
QS['dry_week']={"title":"Сухая неделя","stages":[{"id":"asked","xp":10,"journal":"Испытание Сухарей: неделя у камня на тропе, на одной фляге."},{"id":"done","xp":120,"journal":"С сухой неделей решено.","alt":[alt([fl("dry_week","passed")],"Сухая неделя пройдена: «Мираж» ушёл ни с чем."),alt([fl("dry_week","bought")],"На третий день я купил/а у «Миража» воды. Неделя не засчитана.")]}]}
QS['dry_week']['stages'][1]['alt'][1]['journal']="На третий день «Мираж» продал мне воды. Неделя не засчитана."
QS['ancestors']={"title":"Кости предков","stages":[{"id":"asked","xp":10,"journal":"Кто-то по ночам роет землю у круга костей."},{"id":"truth","xp":60,"journal":"Роет Кремень: он ищет карту водоводов охраны плотины."},{"id":"done","xp":120,"journal":"С картой Кремня решено.","alt":[alt([fl("ancestors","reported")],"Кремень в опале: Мать Трещина знает про раскопки."),alt([fl("ancestors","helped")],"Карта водоводов у Сухарей: Кремень ударит по Тресту первым."),alt([fl("ancestors","taken")],"Карта водоводов у меня.")]}]}
QS['traitor']={"title":"Предатель в круге","stages":[{"id":"asked","xp":10,"journal":"Кто-то в Костяном круге носит вести чужим."},{"id":"truth","xp":60,"journal":"Щебень — оттиск Сургуча: красный воск на его шатре."},{"id":"done","xp":150,"journal":"С предателем решено. Письмо при нём подписано: «Е. Штемпель».","alt":[alt([fl("traitor","exposed")],"Щебня судил круг. Письмо Штемпеля у меня."),alt([fl("traitor","released")],"Щебень ушёл с ложным донесением. Письмо Штемпеля у меня."),alt([fl("traitor","killed")],"Щебень мёртв. Письмо Штемпеля у меня.")]}]}
QS['plate_scheme']={"title":"Схема пластины","stages":[{"id":"asked","xp":10,"journal":"В архиве руин — шкаф с чертежами затворов Заслона."},{"id":"done","xp":150,"journal":"На чертеже — рука Вереса: «ручной сброс» открывает плотину без ключа.","alt":[alt([fl("plate_scheme","lelya")],"Чертёж ручного сброса — у Лёли."),alt([fl("plate_scheme","kept")],"Чертёж ручного сброса — у меня."),alt([fl("plate_scheme","burned")],"Чертёж ручного сброса сожжён.")]}]}
QS['museum']={"title":"Музей","stages":[{"id":"asked","xp":10,"journal":"В музее Водоуправления — Жезл Смотрителя. Автомат-сторож двести лет держит «санитарный день»."},{"id":"done","xp":150,"journal":"Жезл Смотрителя у меня."}]}
QS['city_hall']={"title":"Мэрия","stages":[{"id":"asked","xp":10,"journal":"В мэрии Светлоречья — земельные книги посёлков."},{"id":"done","xp":120,"journal":"По земельным книгам колодцы Круга — собственность посёлков, а не Треста.","alt":[alt([fl("city_hall","brigade")],"Земельные книги хранит Бригада: колодцы Круга — собственность посёлков.")]}]}
QS['library']={"title":"Библиотека","stages":[{"id":"asked","xp":10,"journal":"В библиотеке руин — отчёт о Суховее с вырванными страницами и сургучом на полях."},{"id":"done","xp":100,"journal":"Страницы о Суховее вырвал Сургуч: «Изъять. Е. Ш.»."}]}
QS['draisine']={"title":"Дрезина","stages":[{"id":"asked","xp":10,"journal":"На путях Депо — ржавая дрезина с клеймом «Литерный»."},{"id":"done","xp":120,"journal":"Дрезина на ходу: Депо — руины Светлоречья — «Ворота»."}]}
open('src/content/quests.json','w').write(json.dumps(QS,ensure_ascii=False,indent=1)+'\n')
IT=json.load(open('src/content/items.json'))
Q_=lambda name,desc,icon="icon_letter": {"name":name,"desc":desc,"icon":icon,"cat":"quest","value":0}
IT['key_half']=Q_("Вторая половина пластины","Половина ключа охраны плотины на сухожильном шнурке. Вместе с первой — полный код затворов Заслона.","icon_key")
IT['ransom_note']=Q_("Записка под красным сургучом","«Тубус в обмен. Подвалы Светлоречья». Оттиск — рука, держащая печать.")
IT['ada_letter']=Q_("Письмо Ады Затвор","«Яд мне дал нотариус Штемпель. Своей рукой». Свидетельство против Печатника.")
IT['printer_letter']=Q_("Письмо с подписью «Е. Штемпель»","Распоряжения Сургуча его людям. Подпись нотариуса из Запруды. Улика против Печатника.")
IT['fake_mandate']=Q_("Поддельный тубус","Жесть, воск и старый штамп Водоуправления. Не отличить — если не открывать.","icon_tube")
IT['land_books']=Q_("Земельные книги","Реестр земель и вод бассейна Светлой: колодцы Круга — собственность посёлков. Улика на суде.")
IT['watcher_rod']=Q_("Жезл Смотрителя","Воронёная сталь, латунная капля. Церемониальный ключ пульта Глубокого.","icon_key")
IT['gate_scheme']=Q_("Чертёж затворов","Синька на кальке. Рука Вереса: «Ручной сброс. Третий ярус. Без ключа».")
IT['aqueduct_map']=Q_("Карта водоводов","Карта охраны плотины: тайные водоводы к Заслону.")
IT['suhovey_book']=Q_("Отчёт о Суховее","Страницы 40–56 вырваны. На полях: «Изъять. Е. Ш.».")
open('src/content/items.json','w').write(json.dumps(IT,ensure_ascii=False,indent=2)+'\n')
C=json.load(open('src/content/creatures.json'))
H=["human"]
C['tresh']={"name":"Мать Трещина","sheet":"tresh","tags":H,"hp":26,"ap":7,"seq":11,"skill":50,"weapons":["bone_spear"],"dr":10,"dt":1,"crit":6,"perception":8,"xp":200,"fleeAt":0}
C['shcheben']={"name":"Щебень","sheet":"shcheben","tags":H,"hp":18,"ap":8,"seq":11,"skill":50,"weapons":["knife"],"dr":5,"crit":6,"perception":6,"xp":60,"fleeAt":0}
C['pisar_k']={"name":"Писарь","sheet":"pisar","tags":H,"hp":16,"ap":8,"seq":10,"skill":45,"guns":50,"aim":6,"weapons":["zipgun","knife"],"dr":5,"crit":5,"perception":7,"xp":90,"loot":{"ammo":6},"fleeAt":0}
C['ottisk']={"name":"Оттиск","sheet":"ottisk","tags":H,"hp":26,"ap":8,"seq":11,"skill":55,"guns":60,"aim":6,"weapons":["zipgun","knife"],"dr":10,"dt":1,"crit":6,"perception":7,"xp":120,"loot":{"ammo":8},"fleeAt":0}
C['sealwax_agent']={"name":"Человек Сургуча","sheet":"sealwax_agent","tags":H,"hp":15,"ap":7,"seq":10,"skill":45,"guns":45,"aim":6,"weapons":["zipgun","knife"],"dr":10,"dt":1,"crit":5,"perception":6,"xp":80,"loot":{"ammo":6},"fleeAt":0.2}
C['marauder']={"name":"Мародёр","sheet":"marauder","tags":H,"hp":18,"ap":8,"seq":10,"skill":50,"guns":50,"aim":5,"weapons":["zipgun","club"],"dr":5,"crit":5,"perception":5,"xp":60,"loot":{"ammo":6,"scrap":1},"fleeAt":0.3}
C['wild_machine']={"name":"Дикая машина","sheet":"wild_machine","tags":["machine"],"res":{"poison":100,"shock":-40},"hp":24,"ap":7,"seq":8,"skill":50,"guns":50,"aim":5,"weapons":["sentry_zap"],"dr":20,"dt":2,"crit":4,"perception":5,"xp":70,"loot":{"cells":2},"fleeAt":0}
C['curator_bot']={"name":"Хранитель-4","sheet":"curator","tags":["machine"],"res":{"poison":100,"shock":-30},"hp":45,"ap":7,"seq":8,"skill":60,"guns":50,"aim":5,"weapons":["sentry_zap","club"],"dr":25,"dt":3,"crit":4,"perception":7,"xp":150,"fleeAt":0}
open('src/content/creatures.json','w').write(table(C))
COMP=json.load(open('src/content/companions.json'))
def bark(cid, m, t):
    if not any(b['map']==m for b in COMP[cid]['barks']): COMP[cid]['barks'].append({"map":m,"text":t})
bark('shepot','bone_camp',"Дом. Мать Трещина не любит чужих, но слушает. Говори прямо.")
bark('shepot','ruins_streets',"Город мёртвых бумаг. Сухари сюда не ходят: тут пахнет печатями.")
bark('lelya','ruins_library',"Архив Водоуправления! Если тут есть синька затворов — я её найду.")
bark('lelya','bone_camp',"Сухари смотрят на мой Искровик, как на змею. Я лучше помолчу.")
bark('vedro','ruins_museum',"ХРАНИТЕЛЬ-4. МОДЕЛЬ СТАРШЕ МЕНЯ. ПРИВЕТСТВИЕ НЕ ПОЛУЧЕНО.")
bark('vedro','ruins_cellar',"ДЕТЕКТИРОВАН СУРГУЧ. ПРИОРИТЕТ: ЗАЛОЖНИК.")
open('src/content/companions.json','w').write(table(COMP))
L=json.load(open('src/content/locations.json'))
O=[{"flag":"chapter7_done"}]
L['bone_circle'].update({"map":"bone_camp","entry":"south","open":O,"areas":[
 {"map":"bone_camp","entry":"south","name":"Лагерь","at":[0.5,0.7]},
 {"map":"bone_trail","entry":"south","name":"Тропа испытаний","at":[0.5,0.25],"known":[{"flag":"bones_in"}]},
 {"map":"oath_cave","entry":"crawl","name":"Пещера клятвы","at":[0.8,0.2],"known":[{"flag":"cave_seen"}]}]})
L['capital_ruins'].update({"map":"ruins_streets","entry":"south","open":O,"areas":[
 {"map":"ruins_streets","entry":"south","name":"Улицы","at":[0.5,0.7]},
 {"map":"ruins_museum","entry":"south","name":"Музей Водоуправления","at":[0.5,0.2]},
 {"map":"ruins_library","entry":"west","name":"Библиотека","at":[0.85,0.45]},
 {"map":"ruins_cellar","entry":"ladder","name":"Подвалы","at":[0.3,0.55],"known":[{"flag":"hostage"}]}]})
json.dump(L,open('src/content/locations.json','w'),ensure_ascii=False,indent=2)
print('ok')
