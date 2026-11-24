import yaml, copy, sys
S = "/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/"
X = {c["id"]: c for c in yaml.safe_load(open(S + "x-cases-nonmagi.yaml"))}
COMMON = {"dwelling_id": "h1", "adult_financial_program_received": "none",
          "irrevocable_burial_funds_value": 0, "burial_funds_accrued_interest": 0, "revocable_prepaid_burial_contract_value": 0,
          "life_insurance_cash_surrender_value": 0, "income_producing_property_equity_value": 0,
          "income_producing_property_is_used_in_trade_or_business": False, "retains_ssi_status_without_payment": False,
          "retroactive_benefit_payment_unspent_value": 0, "able_account_value": 0, "investment_personal_property_value": 0,
          "ma_trust_annuity_life_estate_value_available": 0, "revocable_burial_trust_value": 0, "education_program_type": "none"}
CMD = {"pass_set_aside_income": 0, "retroactive_social_security_lump_sum_received": 0,
       "retroactive_ssi_or_public_assistance_lump_sum_received": 0, "foster_care_provider_payments_received": 0,
       "impairment_related_work_expenses_paid": 0, "blind_work_expenses_paid": 0, "pass_set_aside_earned_income": 0,
       "ma_excess_real_property_is_for_sale": False, "ma_claims_co_owner_hardship_for_real_property": False}

def prep(c, new_id, title):
    c = copy.deepcopy(c); c["id"] = new_id; c["title"] = title
    for pid, p in c["persons"].items():
        for k, v in COMMON.items(): p["facts"].setdefault(k, v)
        for k, v in CMD.items(): p.setdefault("month_defaults", {}).setdefault(k, v)
    return c

out = []
# CO-185: burial funds over the exclusion, and a lot for sale
c = prep(X["X-BURIAL"], "CO-185", "An aged person with a revocable burial trust over $1,500 and a lot listed for sale")
f = c["persons"]["p1"]["facts"]
f.update({"revocable_burial_trust_value": 2000, "real_property_other_than_home_equity": 50000, "real_property_for_sale_value": 50000,
          "sale_efforts_verification_document_received": True})
c["persons"]["p1"]["month_defaults"]["ma_excess_real_property_is_for_sale"] = True
out.append(c)
# CO-186: parental deeming
c = prep(X["X-DEEM"], "CO-186", "A disabled child of ten living with a parent who earns 8,000 a month")
out.append(c)
# CO-187: Working Adults Buy-In on HCBS
c = prep(X["X-WAWDHCBS"], "CO-187", "A working disabled adult in the Working Adults Buy-In, designated for the EBD waiver")
c["persons"]["p1"]["facts"].update({"ma_transfer_penalty_months_assigned_from_spouse": 0, "ma_spouse_outside_case_is_institutionalized_and_otherwise_eligible": False})
out.append(c)
# CO-188: court-ordered support of the community spouse
c = prep(X["X-COURT"], "CO-188", "A nursing facility resident ordered by a court to pay his wife 2,500 a month")
c["persons"]["p1"]["facts"]["ma_court_ordered_transfer_to_community_spouse"] = 0
c["persons"]["p1"]["facts"]["court_ordered_spousal_support"] = 2500
out.append(c)
# CO-189: a spouse's IRA
c = prep(X["X-IRA"], "CO-189", "An aged applicant whose younger spouse, not applying, holds a $40,000 IRA")
out.append(c)
for c in out: c["expect"] = {}
yaml.safe_dump(out, open(S + "nm/stored.yaml", "w"), sort_keys=False, allow_unicode=True, width=200)
print("ok")
