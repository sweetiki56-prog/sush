# Stage P content generator: first secrets pass (S15a). Run after lowland.py.
import json, os

F=lambda k,v=None: {"type":"flag","key":k,**({} if v is None else {"value":v})}
Q=lambda q,s: {"type":"quest","quest":q,"stage":s}
G=lambda i: {"type":"give","item":i}
T=lambda i: {"type":"take","item":i}
INC=lambda k,by=1: {"type":"inc","key":k,"by":by}
XP=lambda n: {"type":"xp","amount":n}
GOTO=lambda m,e: {"type":"goto","map":m,"entry":e}
fl=lambda k,eq=None: {"flag":k,**({} if eq is None else {"eq":eq})}
nf=lambda k: {"notFlag":k}
it=lambda i: {"item":i}
at=lambda a,n: {"attr":a,"gte":n}
sk=lambda s,n: {"skill":s,"gte":n}
def opt(text,next=None,**kw):
 o={"text":text}; o.update({k:v for k,v in kw.items() if k in ("if","effects","check")})
 if next: o["next"]=next
 return o
def node(text,options,effects=None):
 n={"text":text,"options":options}
 if effects: n["effects"]=effects
 return n
def dlg(speaker,entry,nodes,portrait=None):
 d={"speaker":speaker}
 if portrait: d["portrait"]=portrait
 d.update({"entry":entry,"nodes":nodes}); return d
def E(*rows): return [{"if":list(r[:-1]),"node":r[-1]} if len(r)>1 else {"node":r[0]} for r in rows]
def chk(skill=None,attr=None,mod=0,pass_=None,fail=None,pe=None,fe=None):
 c={"mod":mod,"pass":pass_,"fail":fail}
 if skill: c["skill"]=skill
 if attr: c["attr"]=attr
 if pe: c["passEffects"]=pe
 if fe: c["failEffects"]=fe
 return c
BYE=lambda text="Отойти.": opt(text)

D={}
COURIER=lambda way,extra=[]: [F("courier_letter",way),Q("last_courier","done"),XP(220)]+extra
D["courier_safe"]=dlg("Пустой сейф",E(("look",)),{"look":node("Дверца вырвана пять лет назад. На пыльном дне — круглый след от тубуса и клеймо баржи «Стрежень».",[BYE()],[F("courier_safe_seen")])})
D["courier_mummy"]=dlg("Последний гонец",E((fl("courier_letter"),"after"),("look",)),{
 "look":node("Под провалившейся стойкой лежит человек в форме Водоуправления. Ремень сумки всё ещё обхватывает высохшую руку. На пряжке: «Гонец И. Вереса».",[
  opt("Рассмотреть завал.","open",**{"if":[fl("navigator")]}),
  opt("Дневник Вереса указывает на тайник под стойкой.","open",**{"if":[it("veres_diary")]}),
  opt("Заметить пустоту под половицами.","open",**{"if":[at("per",8)]}),
  opt("Разобрать завал силой.",None,**{"check":chk(attr="str",mod=-10,pass_="open",fail="stuck")}), BYE()]),
 "stuck":node("Доски держатся на ржавой арматуре. Нужна подсказка или более внимательный взгляд.",[BYE()]),
 "open":node("В сумке — письмо Смотрителя Вереса «Совету колодцев бассейна Светлой»: Мандат предназначался всем посёлкам ниже по течению. Рядом с адресом другим почерком выведено имя: {name}. Чернилам двести лет.",[
  opt("Забрать письмо.","taken",**{"effects":COURIER("kept",[G("courier_letter")])}),
  opt("Передать письмо водоносам Круга.","circle",**{"effects":COURIER("circle")}),
  opt("Передать письмо Шлюзу как улику.","shluz",**{"if":[fl("shluz_ally")],"effects":COURIER("shluz")})]),
 "taken":node("Конверт сухой и хрупкий. Имя не исчезает, как ни поверни его к свету.",[BYE("…")]),
 "circle":node("Водонос прячет письмо под рубаху. — Дойдёт до каждого старосты. Не только до Совета.",[BYE("…")]),
 "shluz":node("Шлюз читает адрес дважды. — Такого Затвор не пережуёт. А имя… не спрашивай меня.",[BYE("…")]),
 "after":node("Последний гонец доставил письмо через двести лет.",[BYE()])})

D["watcher_desk"]=dlg("Стол Смотрителя",E((fl("watcher_diary"),"after"),("look",)),{
 "look":node("Кожаная тетрадь раскрыта на последней странице: «Заречье придёт с оружием. Но больше я боюсь тех, кто ставит печати: они перепишут воду, и никто не заметит».",[
  opt("Забрать дневник.","after",**{"effects":[F("watcher_diary"),G("watcher_diary"),Q("watcher","diary"),XP(120)]}), BYE()]),
 "after":node("На столе остался светлый прямоугольник от тетради.",[BYE()])})
D["watcher_photo"]=dlg("Фотография Светлой",E(("look",)),{"look":node("Полноводная река, дети на мостках, Верес без формы. На обороте: «Чтобы помнили, ради чего затворы».",[BYE()],[F("watcher_photo")])})
D["watcher_terminal"]=dlg("Пульт резервного допуска",E((fl("watcher_clearance"),"after"),("look",)),{
 "look":node("Пульт узнаёт пластину Мандата. Последний приказ: «Машина В-4 „Ведро“ подчиняется держателю законного допуска».",[
  opt("Подтвердить приказ Вереса.","confirmed",**{"effects":[F("watcher_clearance","confirmed"),Q("watcher","done"),XP(180)]}),
  opt("Переписать приказ: подчиняться только держателю Мандата.","rewritten",**{"effects":[F("watcher_clearance","rewritten"),Q("watcher","done"),XP(180)]}),
  opt("Стереть приказ. Ведро свободно.","erased",**{"effects":[F("watcher_clearance","erased"),F("vedro_free"),Q("watcher","done"),XP(180)]}), BYE()]),
 "confirmed":node("Зелёная лампа горит ровно. Приказ Вереса пережил его.",[BYE("…")]),
 "rewritten":node("Лента выплёвывает новый приказ с сегодняшней датой.",[BYE("…")]),
 "erased":node("Строка допуска гаснет. Где-то в коридоре Ведро впервые не ждёт команды.",[BYE("…")]),
 "after":node("Резервный допуск: {f:watcher_clearance}.",[BYE()])})
D["watcher_voice"]=dlg("Голос Вереса",E((fl("watcher_voice"),"again"),("intro",)),{
 "intro":node("Катушка не вращается, но динамик оживает. — Путь всё-таки привёл тебя сюда, {name}. Времени мало. Спрашивай.",[
  opt("Кто ставит печати?","seals"), opt("Кому принадлежит вода?","water"), opt("Ты запись?","record")]),
 "seals":node("— Палата под мэрией. Они называют себя хранителями закона, но закон для них — мягкий воск. Сложи двенадцать оттисков.",[opt("…","again")],[F("watcher_voice","seals"),F("chamber_hint"),Q("watcher","voice")]),
 "water":node("— Тем, кто пьёт ниже по течению. Я написал это дважды: в Мандате и письме гонцу. Один документ дошёл слишком поздно, другой — слишком рано.",[opt("…","again")],[F("watcher_voice","water"),Q("watcher","voice")]),
 "record":node("Динамик молчит так долго, что ответ уже не ждёшь. — А ты? — спрашивает голос.",[opt("…","again")],[F("watcher_voice","record"),Q("watcher","voice")]),
 "again":node("Динамик тёплый. Катушка не движется.",[BYE()])})

D["literny_panel"]=dlg("Пульт охраны тоннеля",E((fl("literny_pass"),"open"),("locked",)),{
 "locked":node("Три линзы следят за пультом. Над клавишами: «КАЗНАЧЕЙСТВО. ЛИТЕРНЫЙ СОСТАВ».",[
  opt("Вставить ключ сухого водосброса — ключ Водоуправления.","open",**{"if":[it("bunker_key")],"effects":[F("literny_pass","key")]}),
  opt("Ведро, передай допуск машины В-4.","open",**{"if":[fl("with_vedro")],"effects":[F("literny_pass","vedro")]}),
  opt("Отключить контур распознавания.",None,**{"check":chk(skill="science",mod=-20,pass_="open",fail="alarm",pe=[F("literny_pass","science")])}),
  opt("Разомкнуть питание машин.",None,**{"check":chk(skill="repair",mod=-20,pass_="open",fail="alarm",pe=[F("literny_pass","repair")])}), BYE()]),
 "alarm":node("Красная лампа вспыхивает. Машины поворачиваются к тебе.",[BYE("…")]),
 "open":node("Линзы гаснут. На дальнем конце тоннеля проступает броневой лоб паровоза.",[BYE("…")])})
D["literny_manifest"]=dlg("Ведомость «Литерного»",E(("look",)),{"look":node("«Состав № Л-1. Штампы расчётных капель бассейна Светлой. Получатель: Палата мер и весов». Поезд не вёз деньги — он вёз право их делать.",[BYE()],[F("literny_truth"),Q("literny","truth")])})
D["seal_mark_12"]=dlg("Двенадцатый оттиск",E((fl("seal_mark_12"),"after"),("look",)),{
 "look":node("На столе штабного вагона — красный круг с рукой и печатью. Двенадцать оттисков складываются в план подвалов мэрии Светлоречья.",[opt("Сложить план.","after",**{"effects":[F("seal_mark_12"),F("chamber_known"),Q("literny","mark"),XP(120)]})]),
 "after":node("Последняя часть плана Палаты снята.",[BYE()])})
D["drop_stamp_safe"]=dlg("Сейф законных штампов",E((fl("drop_stamps"),"after"),("look",)),{
 "look":node("В свинцовых гнёздах — двенадцать стальных штампов. Нынешние капли Треста не совпадают ни с одним: двести лет их чеканят без законного образца.",[
  opt("Забрать штампы и предъявить на суде.","kept",**{"effects":[F("drop_stamps","kept"),G("drop_stamps"),Q("literny","done"),XP(220)]}),
  opt("Продать штампы Тресту за тысячу капель.","sold",**{"effects":[F("drop_stamps","sold"),{"type":"caps","amount":1000},Q("literny","done"),XP(120)]}),
  opt("Разбить штампы. Капли не должны зависеть от старого железа.","destroyed",**{"effects":[F("drop_stamps","destroyed"),Q("literny","done"),XP(180)]})]),
 "kept":node("Сталь тяжёлая. От неё пахнет маслом, которого давно нигде не делают.",[BYE("…")]),
 "sold":node("Сборщики приезжают ночью. Мешок капель остаётся, свинцовые гнёзда пустеют.",[BYE("…")]),
 "destroyed":node("Последний штамп трескается не сразу. Теперь ни у Треста, ни у старого закона нет подлинника.",[BYE("…")]),
 "after":node("Свинцовые гнёзда пусты.",[BYE()])})

marks=[fl(f"seal_mark_{i}") for i in range(1,13)]
D["chamber_door"]=dlg("Дверь Палаты",E((fl("open_chamber_door"),"open"),("shut",)),{
 "shut":node("Глухая дверь под лестницей мэрии. В камне двенадцать неглубоких выемок.",[
  opt("Сложить двенадцать сургучных оттисков.","open",**{"if":marks,"effects":[F("open_chamber_door"),F("chamber_known")]}),
  opt("Сложить письма Печатника и Штемпеля — поля образуют ключ.","open",**{"if":[it("printer_letter"),it("stempel_letter"),at("per",8)],"effects":[F("open_chamber_door"),F("chamber_known")]}),
  opt("Тимофей помнит план министерства из отчёта о Суховее.","open",**{"if":[fl("with_timofey"),it("suhovey_book")],"effects":[F("open_chamber_door"),F("chamber_known")]}), BYE()]),
 "open":node("За дверью — лестница вниз. Пахнет горячим воском.",[opt("Спуститься в Палату.",**{"effects":[GOTO("seal_chamber","south")]}),BYE()])})
D["printer_chamber"]=dlg("Печатник",E((fl("sealwax_member"),"member"),(fl("sealwax_reported"),"reported"),("intro",)),{
 "intro":node("Печатник стоит среди полок, не скрывая лица. — Двенадцать следов привели тебя сюда. Значит, бумага выбрала правильно. Палата предлагает место, а не смерть.",[
  opt("Вступить в Палату. Закон пишут те, кто держит печать.","join"),
  opt("Книги уйдут Шлюзу. Палата закончилась.","report_shluz",**{"if":[fl("shluz_ally")]}),
  opt("Книги уйдут Ордену Росы — там их перепишут открыто.","report_order",**{"if":[fl("keeper")]}),
  opt("Палата закончилась сейчас.","fight",**{"effects":[F("sealwax_enemy")]}), BYE()]),
 "join":node("Печатник протягивает кольцо с чистой печаткой. — Первый урок: пустая печать сильнее готовой. На ней можно вырезать что угодно.",[opt("…",**{"effects":[F("sealwax_member"),F("sealwax_done"),Q("seal_chamber","done"),XP(250)]})]),
 "report_shluz":node("Шлюз принимает книгу без улыбки. — Половина Совета здесь. И половина Треста. Значит, начнём с обеих половин.",[opt("…",**{"effects":[F("sealwax_reported","shluz"),F("sealwax_done"),F("chamber_open"),Q("seal_chamber","done"),XP(250)]})]),
 "report_order":node("Хранители Росы снимают копии при свидетелях. Имена шантажируемых закрывают, приказы Сургуча читают вслух.",[opt("…",**{"effects":[F("sealwax_reported","order"),F("sealwax_done"),F("chamber_open"),Q("seal_chamber","done"),XP(250)]})]),
 "fight":node("Печатник отступает за пресс. Писцы достают оружие из ящиков для бумаг.",[BYE("…")]),
 "member":node("— Бумага ждёт твоей печати.",[BYE()]), "reported":node("Стол Печатника пуст.",[BYE()])},"portrait_ottisk")
D["seal_press"]=dlg("Печатный пресс",E((fl("sealwax_crushed"),"broken"),("look",)),{
 "look":node("Пресс подделывает любую печать бассейна. Но одна перепускная шестерня держит весь нажим.",[
  opt("Переставить шестерню: следующий оттиск расколет станину.",None,**{"check":chk(skill="repair",mod=-20,pass_="broken",fail="fail",pe=[F("sealwax_crushed"),F("sealwax_done"),F("chamber_open"),Q("seal_chamber","done"),XP(250)])}), BYE()]),
 "fail":node("Шестерня не поддаётся. Один писец оборачивается на звук.",[BYE()]),
 "broken":node("Станина лопается пополам. Писцы бегут через запасной ход; без пресса Палата — только пыльный архив.",[BYE("…")])})
D["chamber_ledger"]=dlg("Книга Палаты",E((fl("chamber_ledger"),"after"),("look",)),{
 "look":node("Имена, долги, поддельные решения Совета и приказы Печатника. Рядом — настоящие списки пайщиков, которыми Сургуч шантажировал семьи.",[
  opt("Взять заверенную копию, скрыв имена жертв.","after",**{"if":[fl("chamber_open")],"effects":[F("chamber_ledger"),G("chamber_ledger"),XP(100)]}), BYE()]),
 "after":node("Главные страницы переписаны; имена жертв закрыты.",[BYE()])})

os.makedirs('src/content/dialogues',exist_ok=True)
json.dump(D,open('src/content/dialogues/secrets.json','w'),ensure_ascii=False,indent=1)

# Quest items.
items=json.load(open('src/content/items.json'))
items.update({
 "courier_letter":{"name":"Письмо последнего гонца","desc":"Письмо Вереса Совету колодцев: Мандат предназначался посёлкам бассейна Светлой. Рядом с адресом — имя героя.","icon":"icon_letter","cat":"quest","value":0},
 "watcher_diary":{"name":"Личный дневник Вереса","desc":"Смотритель боялся не только Заречья, но и тех, кто ставит печати. Улика против Сургуча.","icon":"icon_manual","cat":"quest","value":0},
 "drop_stamps":{"name":"Законные штампы капель","desc":"Довоенные штампы казначейства. Нынешние капли Треста не совпадают с законным образцом.","icon":"icon_note","cat":"quest","value":0},
 "chamber_ledger":{"name":"Книга Палаты","desc":"Поддельные решения, приказы Печатника и списки пайщиков. Имена жертв шантажа закрыты.","icon":"icon_manual","cat":"quest","value":0},
})
json.dump(items,open('src/content/items.json','w'),ensure_ascii=False,indent=2)

quests=json.load(open('src/content/quests.json'))
quests.update({
 "last_courier":{"title":"Последний гонец","stages":[{"id":"found","xp":20,"journal":"На южной почтовой станции остался гонец Вереса."},{"id":"done","xp":220,"journal":"Письмо Вереса найдено: Мандат предназначался Совету колодцев бассейна Светлой."}]},
 "watcher":{"title":"Бункер Смотрителя","stages":[{"id":"found","xp":20,"journal":"В скале над Глубоким найден кабинет Вереса."},{"id":"diary","xp":60,"journal":"Дневник Вереса называет тех, кто ставит печати."},{"id":"voice","xp":60,"journal":"Голос Вереса ответил из неподвижной катушки."},{"id":"done","xp":180,"journal":"С резервным допуском Смотрителя решено."}]},
 "literny":{"title":"Литерный","stages":[{"id":"found","xp":20,"journal":"В тоннеле под Солончаками стоит бронепоезд казначейства."},{"id":"truth","xp":60,"journal":"Поезд вёз законные штампы расчётных капель."},{"id":"mark","xp":60,"journal":"Двенадцатый оттиск сложил план Палаты под мэрией."},{"id":"done","xp":220,"journal":"С законными штампами капель решено."}]},
 "seal_chamber":{"title":"Палата мер и печатей","stages":[{"id":"done","xp":250,"journal":"С тайной Палатой Сургуча решено."}]},
})
json.dump(quests,open('src/content/quests.json','w'),ensure_ascii=False,indent=1)

# Places and the new hidden area under the city hall.
loc=json.load(open('src/content/locations.json'))
loc["post_station"]={"name":"Последняя почтовая станция","cell":[30,70],"map":"post_station","entry":"south","open":[fl("chapter1_done")]}
loc["watcher_bunker"]={"name":"Бункер Смотрителя","cell":[34,3],"secret":True,"map":"watcher_bunker","entry":"south","open":[fl("watcher_known")]}
loc["literny"]={"name":"Тоннель «Литерного»","cell":[66,50],"secret":True,"map":"literny_tunnel","entry":"west","open":[fl("literny_known")],"areas":[{"map":"literny_tunnel","entry":"west","name":"Тоннель","at":[.3,.5]},{"map":"literny_train","entry":"west","name":"Бронепоезд","at":[.7,.5],"known":[fl("literny_seen")]}]}
areas=loc["capital_ruins"]["areas"]
if not any(a["map"]=="seal_chamber" for a in areas): areas.append({"map":"seal_chamber","entry":"south","name":"Палата мер и печатей","at":[.18,.3],"known":[fl("chamber_known")]})
json.dump(loc,open('src/content/locations.json','w'),ensure_ascii=False,indent=2)

# Existing hooks: fifth recording, Shunt's key, draisine brand, Tamara's map.
upper=json.load(open('src/content/dialogues/upper.json'))
for e in upper["relay_console"]["nodes"]["rec5"]["effects"]:
 pass
if not any(e.get("key")=="watcher_known" for e in upper["relay_console"]["nodes"]["rec5"]["effects"]): upper["relay_console"]["nodes"]["rec5"]["effects"].append(F("watcher_known"))
for n in ("calmed",):
 for o in upper["shunt"]["nodes"][n]["options"]:
  if o["text"]=="…" and not any(e.get("key")=="watcher_known" for e in o.get("effects",[])): o.setdefault("effects",[]).append(F("watcher_known"))
json.dump(upper,open('src/content/dialogues/upper.json','w'),ensure_ascii=False,indent=1)
bones=json.load(open('src/content/dialogues/bones.json'))
go=bones["draisine_station"]["nodes"]["go"]["options"]
if not any("клеймо" in o["text"] for o in go): go.insert(-1,opt("Осмотреть клеймо казначейства на раме.","brand",**{"if":[nf("literny_known")]}))
bones["draisine_station"]["nodes"]["brand"]=node("Под ржавчиной: «Л-1. Литерный состав. Тоннель 66/50». Рама дрезины когда-то была сервисной тележкой бронепоезда.",[opt("…","go")],[F("literny_known")])
json.dump(bones,open('src/content/dialogues/bones.json','w'),ensure_ascii=False,indent=1)
salt=json.load(open('src/content/dialogues/salt.json'))
for e in salt["tamara"]["nodes"]["thanks"]["effects"]:
 pass
if not any(e.get("key")=="literny_known" for e in salt["tamara"]["nodes"]["thanks"]["effects"]): salt["tamara"]["nodes"]["thanks"]["effects"].append(F("literny_known"))
json.dump(salt,open('src/content/dialogues/salt.json','w'),ensure_ascii=False,indent=1)

# New trial evidence and the bloodless concession.
dam=json.load(open('src/content/dialogues/dam.json'))
z=dam["zatvor_dam"]; opts=z["nodes"]["intro"]["options"]
anchor=next(i for i,o in enumerate(opts) if o["text"].startswith("Суд окончен"))
new=[
 opt("Письмо последнего гонца: Верес передал Мандат Совету колодцев.","shown",**{"if":[fl("courier_letter"),nf("shown_courier")],"effects":[F("shown_courier"),INC("evidence",2)]}),
 opt("Личный дневник Вереса: Сургуч готовил подмену закона.","shown",**{"if":[fl("watcher_diary"),nf("shown_watcher")],"effects":[F("shown_watcher"),INC("evidence")]}),
 opt("Законные штампы: капли Треста чеканятся без права.","stamps",**{"if":[fl("drop_stamps","kept"),nf("shown_stamps")],"effects":[F("shown_stamps"),F("drops_collapsed"),INC("evidence")]}),
 opt("Книга Палаты: приказы Печатника и поддельные решения Совета.","shown",**{"if":[fl("chamber_ledger"),nf("shown_chamber")],"effects":[F("shown_chamber"),INC("evidence")]}),
]
if not any(o["text"].startswith("Письмо последнего") for o in opts): opts[anchor:anchor]=new; anchor+=len(new)
opts[:]=[o for o in opts if not o["text"].startswith("Ты пришёл без крови")]
if not any(o["text"].startswith("За тобой нет крови") for o in opts): opts.insert(anchor+1,opt("За тобой нет крови. Признай подделку сам — и никто здесь не умрёт.","dry_persuaded",**{"if":[{"flag":"evidence","gte":4},nf("blood_drawn")]}))
z["nodes"]["stamps"]=node("Затвор сравнивает штамп с каплей и бледнеет. Весть уйдёт с плотины быстрее воды: накопления бедняков превращаются в металл, а власть Треста — в слух.",[opt("…","intro")])
z["nodes"]["dry_persuaded"]=node("Затвор смотрит на оружие, которое так и не пришлось поднять. — Путь сюда пройден без человеческой крови. Значит, бумага ещё может остановить кровь. — Он подписывает отказ от поддельной копии и сам отдаёт его Шлюзу.",[opt("…",**{"effects":[F("trial_way","persuaded"),F("zatvor_persuaded"),F("dry_hands"),Q("dam","choice"),XP(300)]})])
json.dump(dam,open('src/content/dialogues/dam.json','w'),ensure_ascii=False,indent=1)

# Ending slides and nickname priority.
end=json.load(open('src/content/endings.json'))
seal=next(s for s in end if s["id"]=="sealwax")
seal_new=[
 {"if":[fl("sealwax_member")],"text":"Палата мер и печатей не пала. За столом Печатника появилось новое место, а на решениях Суши — новая печать."},
 {"if":[fl("sealwax_crushed")],"text":"Пресс Палаты расколот, архив открыт. Сургуч потерял тайную власть, а имена его жертв не попали на площадь."},
 {"if":[fl("sealwax_reported")],"text":"Книги Палаты разобраны при свидетелях. Приказы Сургуча читают вслух, имена шантажируемых закрывают."},
]
for v in reversed(seal_new):
 key=v["if"][0]["flag"]
 if not any(any(c.get("flag")==key for c in old.get("if",[])) for old in seal["variants"]): seal["variants"].insert(0,v)
slides=[
 {"id":"courier","title":"Последний гонец","variants":[{"if":[fl("courier_letter")],"text":"Последний гонец доставил письмо через двести лет. На конверте рядом с адресом осталось имя {name}; объяснения ему так и не нашли."}]},
 {"id":"watcher","title":"Бункер Смотрителя","variants":[{"if":[fl("watcher_diary")],"text":"Дневник Вереса вернул Кругу слова Смотрителя. Голос в бункере больше не отвечал, но зелёная лампа не погасла."}]},
 {"id":"literny","title":"Литерный","variants":[{"if":[fl("drops_collapsed")],"text":"Законные штампы обрушили капли. Трест ослаб, но бедняки первыми потеряли накопленное железо."},{"if":[fl("drop_stamps","sold")],"text":"Штампы «Литерного» исчезли в хранилище Треста. Капли держатся, будто бронепоезда никогда не было."},{"if":[fl("drop_stamps","destroyed")],"text":"Законные штампы разбиты. Ни старый закон, ни Трест больше не могут доказать право чеканить капли."}]},
 {"id":"dry_hands","title":"Сухие руки","variants":[{"if":[nf("blood_drawn")],"text":"От Ржавого колодца до Заслона за {name} не осталось человеческой крови. В Суши долго спорили, было ли это силой или чудом."}]},
]
name_i=next(i for i,s in enumerate(end) if s["id"]=="name")
for s in slides:
 old=next((x for x in end if x["id"]==s["id"]),None)
 if old: old.update(s)
 else: end.insert(name_i,s); name_i+=1
name=next(s for s in end if s["id"]=="name")
old_dry=next((v for v in name["variants"] if "Сухие руки" in v["text"]),None)
if old_dry: old_dry["if"]=[nf("blood_drawn")]
else: name["variants"].insert(1,{"if":[nf("blood_drawn")],"text":"{name}. Кличка в Суши — «Сухие руки»: за путь до Заслона без человеческой крови."})
if not any("sealwax_crushed" == c.get("flag") for v in name["variants"] for c in v.get("if",[])): name["variants"].insert(2,{"if":[fl("sealwax_crushed")],"text":"{name}. Кличка в Суши — «Разрыватель печатей»: за уничтоженный пресс Палаты."})
json.dump(end,open('src/content/endings.json','w'),ensure_ascii=False,indent=1)
print('ok')
