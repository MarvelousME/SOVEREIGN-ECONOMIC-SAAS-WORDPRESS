package system

import input as inp

default allow = false

allow {
    inp.method == "GET"
    inp.path[0] == "public"
}

allow {
    inp.subject.roles[_] == "admin"
}

can_create_agent {
    inp.subject.roles[_] == "agent_creator"
}

can_spend_treasury {
    inp.subject.roles[_] == "treasury_admin"
}

can_payout {
    inp.subject.roles[_] == "payout_manager"
    inp.amount <= inp.daily_cap
}

can_alter_ubi_rules {
    inp.subject.roles[_] == "ubi_admin"
}
