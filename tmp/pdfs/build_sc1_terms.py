from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "sc1-terms-and-returns.pdf"
LOGO = ROOT / "sc1logo.jpg"

PAGE_W, PAGE_H = A4
BLACK = colors.HexColor("#050505")
INK = colors.HexColor("#151515")
RED = colors.HexColor("#CF1F28")
MUTED = colors.HexColor("#5E6268")
PALE = colors.HexColor("#F3F3F1")
LINE = colors.HexColor("#D8D8D5")
WHITE = colors.white


def register_fonts():
    font_dir = Path("C:/Windows/Fonts")
    regular = font_dir / "arial.ttf"
    bold = font_dir / "arialbd.ttf"
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("SC1Body", str(regular)))
        pdfmetrics.registerFont(TTFont("SC1Bold", str(bold)))
        return "SC1Body", "SC1Bold"
    return "Helvetica", "Helvetica-Bold"


BODY_FONT, BOLD_FONT = register_fonts()


def draw_cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BLACK)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(RED)
    canvas.rect(0, 0, 8 * mm, PAGE_H, fill=1, stroke=0)
    canvas.restoreState()


def draw_body(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BLACK)
    canvas.rect(0, PAGE_H - 15 * mm, PAGE_W, 15 * mm, fill=1, stroke=0)
    canvas.setFillColor(RED)
    canvas.rect(0, PAGE_H - 15 * mm, 8 * mm, 15 * mm, fill=1, stroke=0)
    canvas.setFont(BOLD_FONT, 8)
    canvas.setFillColor(WHITE)
    canvas.drawString(20 * mm, PAGE_H - 9.6 * mm, "SC1  /  TERMS & RETURNS")

    canvas.setStrokeColor(LINE)
    canvas.line(20 * mm, 15 * mm, PAGE_W - 20 * mm, 15 * mm)
    canvas.setFont(BODY_FONT, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 10 * mm, "Version 1.0 - 25 August 2026")
    canvas.drawRightString(PAGE_W - 20 * mm, 10 * mm, f"PAGE {doc.page - 1}")
    canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="CoverEyebrow",
        parent=styles["Normal"],
        fontName=BOLD_FONT,
        fontSize=10,
        leading=12,
        textColor=RED,
        spaceAfter=6 * mm,
        uppercase=True,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverTitle",
        parent=styles["Title"],
        fontName=BOLD_FONT,
        fontSize=35,
        leading=38,
        textColor=WHITE,
        alignment=TA_LEFT,
        spaceAfter=6 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverSub",
        parent=styles["Normal"],
        fontName=BODY_FONT,
        fontSize=12,
        leading=18,
        textColor=colors.HexColor("#C7C7C7"),
    )
)
styles.add(
    ParagraphStyle(
        name="CoverNotice",
        parent=styles["Normal"],
        fontName=BOLD_FONT,
        fontSize=9,
        leading=13,
        textColor=WHITE,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="PageTitle",
        parent=styles["Heading1"],
        fontName=BOLD_FONT,
        fontSize=24,
        leading=28,
        textColor=INK,
        spaceAfter=6 * mm,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        name="Section",
        parent=styles["Heading2"],
        fontName=BOLD_FONT,
        fontSize=12.5,
        leading=15,
        textColor=INK,
        spaceBefore=3.2 * mm,
        spaceAfter=1.5 * mm,
        keepWithNext=True,
    )
)
styles.add(
    ParagraphStyle(
        name="BodySC1",
        parent=styles["BodyText"],
        fontName=BODY_FONT,
        fontSize=9.2,
        leading=13.2,
        textColor=INK,
        spaceAfter=2.1 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="BulletSC1",
        parent=styles["BodyText"],
        fontName=BODY_FONT,
        fontSize=9,
        leading=12.8,
        leftIndent=4.5 * mm,
        firstLineIndent=-3.2 * mm,
        bulletIndent=0,
        textColor=INK,
        spaceAfter=1.5 * mm,
    )
)
styles.add(
    ParagraphStyle(
        name="Small",
        parent=styles["BodyText"],
        fontName=BODY_FONT,
        fontSize=7.7,
        leading=10.5,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="Callout",
        parent=styles["BodyText"],
        fontName=BOLD_FONT,
        fontSize=9,
        leading=13,
        textColor=INK,
        spaceAfter=0,
    )
)
styles.add(
    ParagraphStyle(
        name="FactTitle",
        parent=styles["BodyText"],
        fontName=BOLD_FONT,
        fontSize=8.3,
        leading=10.5,
        textColor=WHITE,
    )
)
styles.add(
    ParagraphStyle(
        name="FactBody",
        parent=styles["BodyText"],
        fontName=BODY_FONT,
        fontSize=7.7,
        leading=10.5,
        textColor=colors.HexColor("#A7A7A7"),
    )
)


def P(text, style="BodySC1"):
    return Paragraph(text, styles[style])


def bullet(text):
    return Paragraph(f"- {text}", styles["BulletSC1"])


def section(title, paragraphs):
    items = [P(title, "Section")]
    items.extend(paragraphs)
    return KeepTogether(items)


def callout(text, accent=RED):
    table = Table([[P(text, "Callout")]], colWidths=[PAGE_W - 44 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def quick_fact(number, title, detail):
    content = [
        P(f'<font color="#CF1F28"><b>{number}</b></font>', "PageTitle"),
        P(f"<b>{title}</b>", "FactTitle"),
        Spacer(1, 2 * mm),
        P(detail, "FactBody"),
    ]
    return content


def build_story():
    story = []

    # Cover
    logo = Image(str(LOGO), width=78 * mm, height=43.9 * mm)
    logo.hAlign = "LEFT"
    cover_frame_width = PAGE_W - 44 * mm
    cover_inner_width = PAGE_W - 66 * mm
    cover_block = Table(
        [
            [logo],
            [Spacer(1, 19 * mm)],
            [P("SC1 / SUPER CLEAN ONE", "CoverEyebrow")],
            [P("TERMS OF SALE,<br/>DELIVERY, RETURNS<br/>& EXCHANGES", "CoverTitle")],
            [P("A practical EU consumer-law baseline for the SC1 webshop.", "CoverSub")],
            [Spacer(1, 15 * mm)],
        ],
        colWidths=[cover_inner_width],
    )
    cover_block.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    facts = Table(
        [
            [
                quick_fact("14 DAYS", "WITHDRAWAL", "For eligible online purchases, counted from delivery."),
                quick_fact("BUYER", "RETURN SHIPPING", "For withdrawal and voluntary exchanges when disclosed before purchase."),
                quick_fact("2 YEARS", "LEGAL GUARANTEE", "Minimum EU protection for faulty goods, without extra cost."),
            ]
        ],
        colWidths=[cover_inner_width / 3] * 3,
    )
    facts.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#111111")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#333333")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#333333")),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    notice = Table(
        [[P("DRAFT - COMPLETE SELLER DETAILS BEFORE PUBLISHING", "CoverNotice")]],
        colWidths=[cover_inner_width],
    )
    notice.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), RED),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    cover = Table(
        [[cover_block], [facts], [Spacer(1, 10 * mm)], [notice]],
        colWidths=[cover_inner_width],
        rowHeights=[None, None, None, None],
    )
    cover.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    cover_wrapper = Table([[cover]], colWidths=[cover_frame_width], rowHeights=[PAGE_H - 46 * mm])
    cover_wrapper.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 22 * mm),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.extend([cover_wrapper, PageBreak()])

    # Page 1
    story.extend(
        [
            P("1. CONTRACT & ORDERING", "PageTitle"),
            callout(
                "These terms are a baseline for sales to consumers in the EU/EEA. Mandatory consumer law in the buyer's country applies whenever it gives the buyer stronger protection."
            ),
            Spacer(1, 3 * mm),
            section(
                "1.1 Scope",
                [
                    P(
                        "These terms apply when a consumer buys merchandise from the SC1 / Super Clean One webshop. Product-specific information shown before checkout, including price, size, availability and estimated dispatch, forms part of the agreement."
                    )
                ],
            ),
            section(
                "1.2 Seller information - required before publication",
                [
                    P("Trading name: <b>SC1 / Super Clean One</b>"),
                    P('Website: <link href="https://supercleanone.com" color="#CF1F28">supercleanone.com</link>'),
                    P('Current contact channel: <link href="https://telegram.me/+ohwFt9qF6LZlNjE8" color="#CF1F28">SC1Simon on Telegram</link>'),
                    P(
                        "The legal business name, registration/VAT number, physical business address and customer-service email are not present in the current site files. They must be inserted here and shown before checkout before these terms are published. A return address must also be supplied with the return instructions."
                    ),
                ],
            ),
            section(
                "1.3 Order and contract formation",
                [
                    P(
                        "The buyer submits an offer by completing checkout. An automatic receipt confirms that the order was received; the contract is accepted when SC1 confirms the order or dispatches the goods. SC1 may reject or cancel an order where stock, pricing, fraud checks or delivery restrictions make fulfilment impossible. Any payment taken for a cancelled order will be refunded."
                    )
                ],
            ),
            section(
                "1.4 Prices and payment",
                [
                    P(
                        "The price and currency shown at checkout apply. Prices include VAT where legally required. Delivery charges and any other unavoidable charges are shown before the buyer places the order. Payment is processed using the methods offered at checkout."
                    ),
                    P(
                        "For deliveries outside the EU/EEA, local import VAT, duties or handling charges may apply unless checkout expressly states that they are included."
                    ),
                ],
            ),
            section(
                "1.5 Product information",
                [
                    P(
                        "SC1 aims to show products accurately. Small differences in colour can occur between screens, and measurements may vary within normal manufacturing tolerances. These differences do not limit statutory rights where a product is not as described or is faulty."
                    )
                ],
            ),
        ]
    )
    story.append(PageBreak())

    # Page 2
    story.extend(
        [
            P("2. DELIVERY & WITHDRAWAL", "PageTitle"),
            section(
                "2.1 Delivery",
                [
                    P(
                        "Available delivery options, price and estimated timing are shown at checkout. SC1 will deliver within the agreed time. If no specific time has been agreed, EU rules generally require delivery without undue delay and no later than 30 days after the contract is concluded."
                    ),
                    P(
                        "The buyer must provide a complete and correct delivery address. SC1 remains responsible for the goods until the buyer, or a person designated by the buyer, physically receives them."
                    ),
                ],
            ),
            section(
                "2.2 Fourteen-day right of withdrawal",
                [
                    P(
                        "For eligible online purchases, an EU/EEA consumer may withdraw from the contract without giving a reason within 14 days. For goods, the period begins when the buyer, or a person designated by the buyer, receives the goods. For an order delivered in several parts, it begins when the final part is received."
                    ),
                    P(
                        "To withdraw, the buyer must send a clear statement before the deadline using the contact details supplied by SC1. It is enough to state the order number, name, items concerned and that the buyer is exercising the right of withdrawal."
                    ),
                    P(
                        "After giving notice, the buyer must return the goods without undue delay and no later than 14 days after the notice was sent. SC1 will provide the applicable return address."
                    ),
                ],
            ),
            callout(
                "RETURN SHIPPING: For withdrawal and voluntary returns, the buyer pays the direct cost of return postage and suitable packaging because this is disclosed before purchase. The buyer should use a trackable service and keep proof of shipment."
            ),
            Spacer(1, 2.5 * mm),
            section(
                "2.3 Condition of returned goods",
                [
                    P(
                        "The buyer may inspect the product as they would in a physical shop. Clothing may be tried on carefully, but should be returned clean, unworn beyond fitting, unwashed and with labels and original packaging where reasonably possible. The buyer may be responsible for reduced value caused by handling beyond what is necessary to establish the product's nature, characteristics and function."
                    )
                ],
            ),
            section(
                "2.4 Refunds after withdrawal",
                [
                    P(
                        "SC1 will refund the price paid and the cost of the least expensive standard outbound delivery offered for the order. Extra cost chosen for express or premium delivery is not refundable. The refund will use the original payment method unless otherwise agreed, without a fee to the buyer."
                    ),
                    P(
                        "The refund will be made no later than 14 days after SC1 receives the withdrawal notice. SC1 may withhold the refund until the goods are received or the buyer provides evidence that they were sent back, whichever happens first."
                    ),
                ],
            ),
            section(
                "2.5 Exceptions",
                [
                    P(
                        "The statutory withdrawal right may not apply to goods made to the buyer's specifications or clearly personalised, or to sealed goods unsuitable for return for health-protection or hygiene reasons once unsealed, where the legal conditions for the exception are met. Any applicable exception must be disclosed before purchase."
                    )
                ],
            ),
        ]
    )
    story.append(PageBreak())

    # Page 3
    story.extend(
        [
            P("3. EXCHANGES, FAULTS & DISPUTES", "PageTitle"),
            section(
                "3.1 Voluntary exchanges",
                [
                    P(
                        "An exchange for another size or product is a voluntary service and is subject to stock availability. The buyer must contact SC1 before sending anything back. Unless SC1 agrees otherwise, the buyer pays both the return postage and the cost of shipping the replacement item. Any price difference must be paid or will be refunded as appropriate."
                    ),
                    P(
                        "If an exchange cannot be completed, the buyer may use the statutory right of withdrawal while its deadline remains open. This exchange policy does not limit legal rights for faulty or incorrect goods."
                    ),
                ],
            ),
            section(
                "3.2 Faulty, damaged or incorrect goods",
                [
                    P(
                        "Consumers in the EU have a minimum two-year legal guarantee for goods that are faulty, not as described or do not work as advertised. The buyer should contact SC1 promptly with the order number and a description or photographs of the issue."
                    ),
                    bullet("SC1 will provide repair or replacement without cost where required and reasonably possible."),
                    bullet("If repair or replacement is impossible, disproportionate, not completed within a reasonable time or causes significant inconvenience, the buyer may be entitled to a price reduction or refund."),
                    bullet("SC1 pays the necessary return postage for faulty, damaged or incorrectly supplied goods. The buyer must not pay this cost."),
                    P(
                        "Damage visible on delivery should be documented as soon as possible. Reporting transport damage quickly helps SC1 investigate with the carrier but does not remove mandatory consumer rights."
                    ),
                ],
            ),
            section(
                "3.3 Complaints",
                [
                    P(
                        "A complaint should include the buyer's name, order number, contact details, the product concerned and the requested solution. SC1 will acknowledge and handle the complaint within a reasonable time. Before publication, SC1 must add a monitored customer-service email and legal postal address to this document and the webshop."
                    )
                ],
            ),
            section(
                "3.4 Liability and events outside reasonable control",
                [
                    P(
                        "Nothing in these terms excludes liability that cannot legally be excluded, including mandatory consumer rights. SC1 is not responsible for indirect business losses suffered by a consumer or for delay caused by events outside reasonable control, but will communicate material delays and provide any remedy required by law."
                    )
                ],
            ),
            section(
                "3.5 Applicable law and disputes",
                [
                    P(
                        "The law of the country where the seller is established applies, without depriving an EU/EEA consumer of mandatory protection available in the consumer's country of residence. The parties should first try to resolve complaints directly. The consumer may also use the competent national consumer authority, alternative dispute-resolution body or courts available under applicable law."
                    )
                ],
            ),
            section(
                "3.6 Changes",
                [
                    P(
                        "The version accepted at checkout applies to the order. SC1 may update these terms for future orders when business details, services or legal requirements change."
                    )
                ],
            ),
        ]
    )
    story.append(PageBreak())

    # Page 4
    story.extend(
        [
            P("4. BEFORE PUBLISHING", "PageTitle"),
            callout(
                "This document is a working draft based on general EU consumer rules. It is not a substitute for legal advice or a review against the national law of the seller's country."
            ),
            Spacer(1, 4 * mm),
            section(
                "Complete these seller details",
                [
                    bullet("Legal business name and trading name."),
                    bullet("Registration number and VAT number, where applicable."),
                    bullet("Physical business address and legal postal address."),
                    bullet("Monitored customer-service email and telephone number, if used."),
                    bullet("Return address and practical return instructions."),
                    bullet("Available delivery areas, methods, prices and expected timings."),
                ],
            ),
            section(
                "Checkout and publication checks",
                [
                    bullet("Link these terms clearly before the customer places the order."),
                    bullet("Show the total product price, taxes, shipping and other charges before payment."),
                    bullet("Make the order button clearly indicate that placing the order creates a payment obligation."),
                    bullet("Send the buyer order confirmation and these terms in a durable format, such as email or an attached PDF."),
                    bullet("Keep the return-shipping disclosure visible: the buyer pays for withdrawal and voluntary exchange; SC1 pays for faulty or incorrect goods."),
                    bullet("Provide the model withdrawal form required by applicable distance-selling law."),
                    bullet("Have the final text reviewed for the seller's national law and actual Shopify checkout process."),
                ],
            ),
            section(
                "Official EU reference material",
                [
                    P(
                        '<link href="https://europa.eu/youreurope/citizens/consumers/shopping/returns/index_en.htm" color="#CF1F28"><b>Returns and the right of withdrawal - Your Europe</b></link><br/>14-day cooling-off period, return costs, exceptions and faulty-goods postage.'
                    ),
                    P(
                        '<link href="https://europa.eu/youreurope/citizens/consumers/shopping/guarantees/index_en.htm" color="#CF1F28"><b>Guarantees on goods bought in the EU - Your Europe</b></link><br/>Minimum two-year legal guarantee and remedies for faulty goods.'
                    ),
                    P(
                        '<link href="https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_en.htm" color="#CF1F28"><b>B2C e-commerce and distance selling - Your Europe</b></link><br/>Pre-contract information, refunds, delivery and distance-selling duties.'
                    ),
                    P(
                        '<link href="https://europa.eu/youreurope/citizens/consumers/shopping/contract-information/index_en.htm" color="#CF1F28"><b>Contract information for consumers - Your Europe</b></link><br/>Seller identity, contact, price, delivery and returns information required before purchase.'
                    ),
                ],
            ),
            Spacer(1, 4 * mm),
            P("SC1 / SUPER CLEAN ONE", "Section"),
            P("Version 1.0 - prepared 25 August 2026", "Small"),
        ]
    )
    return story


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        title="SC1 Terms of Sale, Delivery, Returns & Exchanges",
        author="SC1 / Super Clean One",
        subject="EU consumer terms draft for the SC1 webshop",
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )
    doc.build(build_story(), onFirstPage=draw_cover, onLaterPages=draw_body)
    print(OUTPUT)


if __name__ == "__main__":
    main()
