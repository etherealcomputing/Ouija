"""Sidecar defaults the device stream does not carry.

Consumer EEG SDKs (Neurosity Crown, Upside Down Labs BioAmp) stream samples
plus a channel list and sampling rate, but *not* the electrode referencing,
ground, or power-line frequency that a BIDS `_eeg.json` sidecar requires. Those
must be supplied from the hardware's published specs / the recording setup —
they are configuration, not data read off the wire.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class EegSidecarConfig:
    """Fields injected into the BIDS `_eeg.json` sidecar."""

    manufacturer: str = "Neurosity"
    model: str = "Crown"
    # The Crown uses a driven-reference (CMS/DRL) analog front-end.
    eeg_reference: str = "CMS/DRL driven reference (Neurosity Crown)"
    eeg_ground: str = "DRL (driven right leg)"
    # Mains frequency at the recording site. 60 Hz in North America, 50 elsewhere.
    power_line_freq: float = 60.0
    # 10-20 label set used to place electrodes for montage/plotting.
    montage: str = "standard_1020"
    software_filters: str = "n/a"


# The Neurosity Crown's fixed 8-channel montage (10-20 labels).
CROWN_CHANNELS: list[str] = ["CP3", "C3", "F5", "PO3", "PO4", "F6", "C4", "CP4"]
CROWN_SFREQ: float = 256.0


@dataclass
class PiEegSidecarConfig(EegSidecarConfig):
    """Sidecar defaults for the open-hardware PiEEG (ADS1299) shield.

    Per the pieeg-club acquisition scripts: common reference via the ADS1299
    SRB1 pin (one reference electrode routed to every channel's negative input),
    driven ground via the BIAS buffer, 24-bit, 250 Hz.
    """

    manufacturer: str = "PiEEG"
    model: str = "PiEEG (ADS1299)"
    eeg_reference: str = "SRB1 common reference (ADS1299)"
    eeg_ground: str = "BIAS driven ground (ADS1299)"
    power_line_freq: float = 60.0
    montage: str = "standard_1020"
    software_filters: str = "n/a"


# The PiEEG 8-channel dry-cap montage. The cap labels the temporal sites T3/T4
# (legacy nomenclature); modern 10-20 / MNE `standard_1020` calls them T7/T8, so
# we store the modern names for correct electrode placement.
PIEEG_CHANNELS: list[str] = ["Fp1", "Fp2", "T7", "C3", "C4", "T8", "O1", "O2"]
PIEEG_SFREQ: float = 250.0
# PiEEG's get_voltage() scales raw ADS1299 counts by 4.5 V / (2**24 - 1) → µV.
PIEEG_UV_PER_COUNT: float = 4.5e6 / (2**24 - 1)


@dataclass(frozen=True)
class ChordsBoard:
    """Per-board acquisition specs for Upside Down Labs Chords firmware.

    The BioAmp boards are single-channel *analog front-ends with no ADC* — the
    board's MCU ADC digitizes them, so bits/Vref/sample-rate come from the MCU,
    not the AFE. Values from the Chords-Python `supported_boards` table.
    """

    name: str
    bits: int
    vref: float  # ADC reference volts (NOT transmitted — from the board's supply)
    sfreq: float
    adc_channels: int  # MCU ADC pins scanned (≠ electrodes; each BioAmp = 1 channel)


# Chords `supported_boards` (WHORU id → specs). AVR = 250 Hz @5V; the rest 500 Hz @3.3V.
CHORDS_BOARDS: dict[str, ChordsBoard] = {
    "UNO-R3": ChordsBoard("UNO-R3", 10, 5.0, 250.0, 6),
    "UNO-CLONE": ChordsBoard("UNO-CLONE", 10, 5.0, 250.0, 6),
    "GENUINO-UNO": ChordsBoard("GENUINO-UNO", 10, 5.0, 250.0, 6),
    "NANO-CLASSIC": ChordsBoard("NANO-CLASSIC", 10, 5.0, 250.0, 8),
    "MEGA-2560-R3": ChordsBoard("MEGA-2560-R3", 10, 5.0, 250.0, 16),
    "UNO-R4": ChordsBoard("UNO-R4", 14, 3.3, 500.0, 6),
    "RPI-PICO-RP2040": ChordsBoard("RPI-PICO-RP2040", 12, 3.3, 500.0, 3),
    "NPG-LITE": ChordsBoard("NPG-LITE", 12, 3.3, 500.0, 3),
    "STM32F4-BLACK-PILL": ChordsBoard("STM32F4-BLACK-PILL", 12, 3.3, 500.0, 8),
    "STM32G4-CORE-BOARD": ChordsBoard("STM32G4-CORE-BOARD", 12, 3.3, 500.0, 16),
    "GIGA-R1": ChordsBoard("GIGA-R1", 16, 3.3, 500.0, 6),
}


@dataclass
class ChordsSidecarConfig(EegSidecarConfig):
    """Sidecar defaults for Upside Down Labs BioAmp acquired via Chords.

    The EEG BioAmp is a 1-channel differential AFE (IN+ Fp1 / IN- Fp2, REF at the
    mastoid), band-pass 0.5–29.5 Hz. Chords records *raw ADC counts*, never µV,
    so counts→volts needs {bits, vref, gain}; **gain is unpublished by UDL and
    must be supplied as a measured calibration constant.**
    """

    manufacturer: str = "Upside Down Labs"
    model: str = "BioAmp EXG Pill (via Chords)"
    eeg_reference: str = "REF electrode at the mastoid (behind the earlobe)"
    eeg_ground: str = "n/a (differential BioAmp AFE)"
    power_line_freq: float = 60.0
    montage: str = "standard_1020"
    # BIDS requires SoftwareFilters to be "n/a" or a structured object. The BioAmp
    # 0.5-29.5 Hz band-pass is an analog/hardware filter — documented in the README.
    software_filters: str = "n/a"


def chords_counts_to_volts(counts, bits: int, vref: float, gain: float):
    """Convert raw Chords ADC counts (midscale-offset unsigned) to volts.

    volts = ((counts - 2**(bits-1)) / 2**bits) * Vref / gain
    Works on scalars or numpy arrays. `gain` is the BioAmp gain — a required,
    user-supplied calibration constant (UDL does not publish a default).
    """
    return ((counts - 2 ** (bits - 1)) / (2 ** bits)) * (vref / gain)


# Default single-channel EEG montage for a BioAmp EEG setup (IN+ at Fp1).
CHORDS_EEG_CHANNELS: list[str] = ["Fp1"]
