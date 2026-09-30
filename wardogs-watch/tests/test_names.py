from wdwatch.names import NameRegistry, normalize, same_person


def test_normalize_drops_symbols_and_case():
    assert normalize("Ghost-Wolf ") == "ghostwolf"
    assert normalize("[KR] 김치_Sniper") == "kr김치sniper"


def test_ocr_variants_are_same_person():
    assert same_person(normalize("NightOwl_K"), normalize("Night0wl_K"), 0.84)
    assert same_person(normalize("Ghost-Wolf"), normalize("Ghost-Wo1f"), 0.84)


def test_different_numbers_are_different_people():
    assert not same_person(normalize("Player123"), normalize("Player124"), 0.84)
    assert not same_person(normalize("Wolf1"), normalize("Wolf2"), 0.84)


def test_registry_merges_variants_and_keeps_common_spelling():
    reg = NameRegistry()
    k1 = reg.resolve("NightOwl_K")
    k2 = reg.resolve("Night0wl_K")
    reg.resolve("NightOwl_K")
    assert k1 == k2
    assert reg.display(k1) == "NightOwl_K"
    assert len(reg) == 1


def test_lookup_does_not_register():
    reg = NameRegistry()
    assert reg.lookup("tanker99") is None
    assert len(reg) == 0
    assert reg.resolve("ab") is None  # 너무 짧은 건 이름으로 안 봄
