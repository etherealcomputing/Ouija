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
